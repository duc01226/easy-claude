---
name: framework-config
description: '[Utilities] Use when asking about or configuring the .claude/.codex/.agents/.opencode skills framework: command discovery/help, settings, hooks, workflows, activation or framework usage. Explains options; changes only requested settings.'
---

> Codex compatibility note:
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Host-native execution: Codex runs a skill by loading its `SKILL.md` instructions and executing the required steps with available tools. No separate `Skill` tool is required; a loaded skill is already activated.
> - Source vs execution: prefer the registered `.agents/skills/<name>/SKILL.md` for Codex execution. `.claude/**` remains the canonical authoring source; reading it for a registry or source inspection does not switch this session to Claude Code.
> - Capability check: interpret Claude tool names through the active host before declaring a blocker. Continue when Codex can perform the required operation; stop and ask only when the actual capability is unavailable, naming the step and evidence. Host-native execution is not a protocol deviation and needs no extra approval.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - Use ask user tool to ask user.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, steps follow the guided contract in `$start-workflow` (gate steps fixed; other steps may flex with a logged reason); report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.
# Framework Configuration and Help

Answer framework questions and manage requested settings without requiring the user to know JSON keys.
This lightweight entry skill remains eligible for automatic selection when heavy skill auto-trigger
is disabled. It does not authorize unrelated heavy skills, scans or workflows.

## Choose a mode

`$framework-config [--mode=help|settings|workflow] <request> [options]`
(Codex: `$framework-config`; OpenCode uses its native skill loader.) Infer the mode from natural
language when no flag is given; no arguments shows the three modes and a few common options.

| Mode | Purpose | Examples |
| --- | --- | --- |
| `help` | Command/category search, command details, task recommendations, framework usage | `--mode=help`, `--mode=help review`, `--mode=help "debug a login error"` |
| `settings` | Show/explain/set/reset a framework preference | `--mode=settings show`, `--mode=settings disable heavy auto-trigger --scope=checkout` |
| `workflow` | Show/set workflow route mode ask/auto/off, including session-only changes | `--mode=workflow --show`, `--mode=workflow off --scope=session` |

- A question, “show”, “explain”, “what can I configure”, or missing arguments is read-only. Never
  turn a question or command recommendation into a config edit or execution of that command.
- “Set”, “enable”, “disable”, “change”, or “reset” authorizes only the requested setting change.
- Default write scope is **checkout** for settings. Workflow mode defaults to **session** for a bare
  ask/auto/off selection. Explicit `--scope=session|checkout|user|team` wins; session scope is supported
  only for workflow routing. User means every project; team means the configured project default.
  OCR enable/off/status uses the project preference route below, outside these generic scope defaults;
  unsupported OCR preference scopes are explained without writing a different layer.
- Application configuration and unrelated product/API questions are outside this skill. Project facts
  use the configured project information; do not invent project facts from generic framework docs.

## Help mode

Run `.claude/scripts/ck-help.py` using the available Python interpreter (`py -3` on Windows), with the
relevant English query (translate non-English search terms). It owns command/category search and task
recommendations. Respect its `@CK_OUTPUT_TYPE` marker: comprehensive-docs, category-guide,
command-details, search-results or task-recommendations. For an explicit catalog/document request,
show the complete relevant output then examples; for a focused question, answer the relevant part with
source pointers. Do not launch recommended heavy skills unless separately authorized.

The help backend's `config/settings/options/switches/env` queries use
`node .claude/scripts/ck-config-help.cjs` for schema-generated settings help. This is help, not mutation.
`$plan` → `$plan --mode=execute` is the planning flow; `$feature-implement` is standalone.

## Workflow mode

- Show the effective mode and every layer using `node .claude/scripts/workflow-mode.cjs --show`
  (add the actual `--session=<id>` when known). Report its source and missing-session note. Never
  infer the current session's value from files alone.
- For a session request, the first-line `$framework-config --mode=workflow ask|auto|off` directive
  (optional `--scope=session`) is applied by the route hook. Old `workflow-mode:` directives remain
  compatible. If natural language did not form a directive, run the helper with the requested mode,
  `--set-session` and the real session id. Never fabricate an id. Without an id/hook, follow the
  requested mode in this conversation and disclose that runtime session persistence is unavailable.
- With `--scope=user` (or legacy `--save`), run the helper `<mode> --save`; checkout (or
  `--save --local`) adds `--local`. It refuses unless git reports the file ignored. A prompt directive
  ending in `--save` also sets the session and saves the user preference, with independent outcomes.
- Team scope and reset use the scoped settings procedure below for `portability.workflowRouteMode`.
  Do not change a tracked file for a personal/session request. Resetting a session preference removes
  the preference using the helper `--reset-session` and the real session id, then reads the effective mode again;
  do not remove the session directory or other hook records.
- Report the helper's effective mode, source, saved file and any higher-precedence override verbatim.
  Precedence: default ask → team → user → checkout → environment → session directive.
  No gate or user choice is waived by a route-mode change. Runtime changes require no mirror sync.

## Settings mode

Resolve the requested preference, apply it only to the selected scope, and report the effective result.

## Discover exact keys and current behavior

Work from the adopting project's root; use that project's copied framework, never an authoring-repo path.

1. For personal settings and common switches, run `node .claude/scripts/ck-config-help.cjs --json`.
   For project options, run `node .claude/skills/project-config/scripts/project-config-help.cjs --search=<term>`
   or `--section=<section>`. Read only the owning documentation relevant to the question.
2. For commands and general framework help, run `.claude/scripts/ck-help.py` with the available Python
   interpreter (`py -3` on Windows) and the relevant English search terms, or read `.claude/docs/README.md`
   and its linked topic. Present the relevant answer and usable examples; no need to start another skill.
3. Use `.claude/scripts/lib/workflow-routing-config.cjs` to resolve paths and effective runtime choices.
   Its `resolveProjectConfigPath(root)` honors `portability.projectConfigPath` in `.claude/.ck.json`;
   `resolveUserConfigPath()` resolves the actual home; `resolveLocalOverridePath(root)` resolves the checkout.
   For skill activation, `resolveSkillAutoTrigger({rootDir: root})` returns `enabled`, `source` and paths.
   For workflow routing, use `resolveWorkflowRouteMode` and report any session-specific limitation.
4. Never guess a key or silently substitute a different setting. An unsupported option needs an explanation,
   not invented JSON. Existing environment overrides can mask a saved choice; report that explicitly.

## OCR project preference

OCR status/enable/off is a **project preference**, including when generic settings default to checkout. Route it through `.claude/skills/project-config/SKILL.md` → “OCR project preference — focused route”; never save it into personal/local framework settings or use the workflow-only path resolver for it. Explicit personal machine permission requests still use their independent `reviewTools.openCodeReview` policy.

From the consuming project root, run `node .claude/skills/project-config/scripts/review-setup.cjs --action inspect`. Show its actual `configPath` and preference (`provider: null` Unset, `none` Off, `open-code-review` Enabled). Questions/status write nothing. For explicit owner enable/off, use that same helper with `--action enable|off --expected-source <exact-inspect-token>`; retain the inspected `expectedSource` unchanged. It uses the full canonical project loader/relocation, validates the complete candidate and readback, and preserves unrelated settings, rules and grouping. Before-publication nonzero/status `refused` means “Review assistance settings not saved”. For `config-publication-unverified`, report “Review assistance settings may have changed; confirmation unavailable”; invalidate prior preparation/evidence, re-inspect current settings and freshly capture current target/policy before continued review. Report the bounded reason, never silently retry/acquire or overwrite through the generic setting writer.

No provider is invoked/acquired by configuration. Report only verified saved preference, actual destination and readback; Enabled does not imply tool Ready or expanded machine authority. A continuing review needs fresh exact target/policy/output after a save. Read `.claude/skills/shared/review-preparation.md` when a source review reaches Unset: that owner asks exactly Accept setup / Turn off OCR for this project / Skip this time once; Skip never persists. Off stays quiet on later reviews until deliberate re-enable. OCR project requests use this route instead of the generic procedure below; unsupported scope requests are explained without writing a different layer.

## Apply a requested setting

1. Resolve the selected destination: team → configured project config; user → `~/.claude/.ck.json`;
   checkout → `.claude/.ck.local.json`. Verify checkout-local config is git-ignored before writing it;
   if not, add only its ignore entry to the project's ignore file as part of the requested personal setup.
2. Read the existing file as JSON, preserving unrelated keys. An invalid/unreadable existing file is a
   repair issue: report it and do not replace it with an empty object. A missing personal file may be created;
   a missing team config needs the minimum valid project identity rather than a partial invalid config.
3. Merge only the requested key. Reset removes that key from the chosen layer and keeps every other key;
   it exposes the next preference/default rather than forcing a hardcoded value. Do not delete other layers.
4. Validate the candidate before saving: `validateConfig(candidate)` from
   `.claude/hooks/lib/project-config-schema.cjs` for team config, or `validateCkConfig(candidate)` from
   `.claude/hooks/lib/ck-config-schema.cjs` for personal config. Report validation errors without saving.
   Use normal host file tools or a small properly quoted script; never interpolate user text into shell code.
5. Save, reread, validate, and resolve the effective value again. Report the exact file, saved preference,
   winning value/source, and whether regeneration is needed. Runtime switches need no mirror regeneration.
   Native visibility/profile changes use their documented generator; never edit generated mirrors by hand.

## Common language → setting

| Request | Exact setting | Behavior |
| --- | --- | --- |
| “Don't automatically start heavy skills” | `portability.skillAutoTrigger: false` | Ask once to run a suitable matched skill or skip and execute directly; named requests, required calls and authorized workflow steps remain allowed |
| “Restore automatic skills” | `portability.skillAutoTrigger: true`, or reset if requested | Later valid preference wins; default true |
| “Workflows should ask / start automatically / only run explicitly” | `portability.workflowRouteMode: "ask" / "auto" / "off"` | Separate workflow routing preference |

Skill-auto-trigger precedence: default → team → user → checkout → `CK_SKILL_AUTO_TRIGGER`.
`commit`, `pull-request` and this configuration/help entry remain eligible under restricted selection.
An explicitly requested workflow authorizes its scoped planned skill calls, including later/resumed steps
and required nested calls. Commit and pull-request both ask for test/review choices with explicit Skip options; configuration never answers those questions or approves a skip. Required skills selected through those choices remain callable even when auto-trigger is disabled.
For a suitable unrequested skill match, false asks once to run that skill or skip and execute directly,
then waits for the answer. Confirmation authorizes its scoped dependencies; Skip keeps direct execution
and required checks without re-asking for the same task. No match proceeds directly without a question.
Named requests and already authorized steps need no skill-choice question.
This runtime switch is model guidance, not a hard permission boundary.

Examples of automatic matches: “How do these .claude skills work?”, “What can I configure in this
.codex framework?”, “Disable heavy skill auto-trigger for me”, “Explain framework hooks”, and
“Which setting controls workflows?”. No file is changed by the questions.
