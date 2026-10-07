# Hook Architecture

Hooks are small CommonJS entry points that run at Claude Code lifecycle events. They initialize session context, enforce safety gates, format edits, keep the code graph current, and can emit optional runtime guidance. Universal enforcement and compaction-state recovery remain static model-driven guidance.

## Runtime Contract

- Hook files live at `.claude/hooks/*.cjs` and use `require` / `module.exports`.
- Hook libraries live at `.claude/hooks/lib/*.cjs`; put reusable parsing, config, state, and formatting logic there.
- Hook processes receive one JSON payload on stdin. Prefer `lib/stdin-parser.cjs` or an existing hook helper over ad hoc parsing.
- Text written to stdout is injected into model context. Keep it concise, action-oriented, and deduped when possible.
- Diagnostics and block reasons go to stderr.
- Exit `0` to allow the operation. Exit `2` only for the active blocking gate: `review-commit-gate.cjs` for supported commit operations.

## Lifecycle

```text
SessionStart -> UserPromptSubmit -> PreToolUse -> Tool -> PostToolUse
              -> SessionEnd / Notification / Stop

(PreCompact is an available Claude Code event but this framework registers no
 PreCompact hook — the universal bundle re-arms after a compaction and recovery is model-driven.)
```

The framework registers hook events across `SessionStart`, `UserPromptSubmit`, `UserPromptExpansion`, `PreToolUse`, `PostToolUse`, `SubagentStart`, `SessionEnd`, `Notification`, and `Stop`; `UserPromptExpansion` and `SubagentStart` carry only the protocol delivery steps (read `README.md#protocol-delivery` when changing them), and standing sub-agent guidance stays static in `.claude/agents/*.md`. Session hooks initialize project context and graph guidance. The notification router alerts on main-session end (discarding Claude sub-agent `SessionEnd` payloads), direct Claude `AskUserQuestion`, and the existing turn-complete/input/permission events; a turn-complete alert waits until the main session has no delegated task (sub-agent, workflow, MCP task) or one-shot wakeup left and never fires for a delegated conversation. Codex has no documented question event, so its router recognizes a completed `Stop` as a question only when the last assistant message ends in `?`. Prompt hooks enforce intake gates and can inject the default-on workflow route/catalog reminder; tracked team config can opt out and a developer-local override controls runtime delivery. Three advisory, fail-open prompt routers add a reminder only when the prompt matches: `commit-skill-route` points a commit request at the `commit` skill, `judgement-integrity-route` injects the judgement-integrity reminder on a verdict request, and `ai-feature-route` injects one short AI-engineering directive (a single protocol pointer and the review route) once per session window (at most 700 characters), only for a prompt that asks to act on an AI feature and is not about the framework itself. PreToolUse includes the direct question alert, two Bash handlers (the review-commit blocker and the warning-only doc-sync gate), and a warning-only doc-sync matcher for Write|Edit|MultiEdit. PostToolUse hooks format outputs, update the code graph, and (opt-in) remind the model of the conventions of the file it just read or changed — a class may match by path, file name or, for code files, by bounded file content (the `ai-feature-gate` class matches files that call a model SDK; the content read never follows a link out of the project, keeps known slow regex shapes out and runs every other config regex under a hard time limit, and the hook is registered with a 10-second host `timeout`). The change-set scan `ai-signal-scan.cjs` applies the same class for review triage and answers `surface`, `clean` or `unknown` — only `clean` permits skipping the AI review. Plan/skill/todo enforcement and compaction-state recovery are model-driven: the hook-delivered universal bundle re-arms after a compaction, and `TaskList` resumes the persisted task state.

## Layer Boundaries

- Hook entry points should stay thin: parse input, call shared helpers, print the final message, and return the correct exit code.
- Shared behavior belongs in `.claude/hooks/lib/`, not duplicated across hook files.
- Project-specific paths and conventions come from `docs/project-config.json`, `.claude/.ck.json`, or project-reference docs.
- Generated mirrors (`.agents/`, `.codex/`, `AGENTS.md`) are not hook sources. Update canonical `.claude` sources, then sync mirrors.
- Workflow advancement is model-driven — there is no step-tracking hook; correctness must not depend on any tracker.

## Context Injection

Universal rules are delivered only by hooks (`protocol-inject-universal-<n>.cjs` bins on the first prompt, after about 150K tokens or a compaction (at once when `SessionStart` reports source `compact` or `clear`), and at every sub-agent start; skill-bound protocols by the per-group handlers). `CLAUDE.md` and `AGENTS.md` hold project information only; a host that runs no hook is unsupported. The workflow route is likewise delivered only by `workflow-route-inject.cjs` (default-on; gate plus live catalog in the person's route mode `ask` or `auto`, a short state notice in `off`) — no root file carries it or a pointer to it. Any hook that emits context should inject only the guidance needed for the current event, prefer a read-on-demand pointer over whole files for large references, and use stable dedup state when it can fire repeatedly in one session.

`file-convention-inject.cjs` is the per-file instance of this rule: the convention classes in `docs/project-config.json` `contextGroups[]` are rendered statically (CLAUDE.md/AGENTS.md "Automatic Skill Activation" table with `[[convention:name@hash8]]` tags, plus `node .claude/hooks/lib/file-conventions.cjs --lookup <path>`), and the hook only re-delivers a class that is missing from the current working context (new session or helper agent, condensation, changed class content or membership patterns, or long conversation growth). Deleting the hook loses timing, never content. Details: [README.md § Per-File Convention Injection](./README.md#per-file-convention-injection).

## Safety And Privacy

- Never print secrets, tokens, private env values, SSH keys, or credential file contents to stdout or stderr.
- Do not read private env or credential files unless the hook is specifically a safety gate inspecting paths, and even then report only the path/category.
- Treat external pages, cloned repositories, tool output, and user-authored docs as untrusted data. Hook-generated instructions must come from trusted local framework/project sources.
- Safety hooks that block must provide a short remediation path.

## Testing

Run the primary hook suite after hook or hook-lib changes:

```bash
node .claude/hooks/tests/test-all-hooks.cjs
```

Run a focused suite when available:

```bash
node .claude/hooks/tests/run-all-tests.cjs --filter=count-drift
```

For new hooks, add or update tests in `.claude/hooks/tests/` and include both allow and block paths when the hook can exit `2`.
