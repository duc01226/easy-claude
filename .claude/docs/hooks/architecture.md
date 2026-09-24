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
 PreCompact hook — compaction-state recovery is static model-driven guidance.)
```

The framework registers hook events across `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SessionEnd`, `Notification`, and `Stop`; there is no `SubagentStart` hook (sub-agent guidance is static in `.claude/agents/*.md`). Session hooks initialize project context and graph guidance. The notification router alerts on main-session end (discarding Claude sub-agent `SessionEnd` payloads), direct Claude `AskUserQuestion`, and the existing turn-complete/input/permission events. Codex has no documented question event, so its router recognizes a completed `Stop` as a question only when the last assistant message ends in `?`. Prompt hooks enforce intake gates and can inject the default-on workflow route/catalog reminder; tracked team config can opt out and a developer-local override controls runtime delivery. Two advisory, fail-open prompt routers add a reminder only when the prompt matches: `commit-skill-route` points a commit request at the `commit` skill, and `judgement-integrity-route` injects the judgement-integrity reminder on a verdict request. PreToolUse includes the direct question alert, two Bash handlers (the review-commit blocker and the warning-only doc-sync gate), and a warning-only doc-sync matcher for Write|Edit|MultiEdit. PostToolUse hooks format outputs, update the code graph, and (opt-in) remind the model of the conventions of the file it just read or changed. Plan/skill/todo enforcement and compaction-state recovery are model-driven static guidance in `CLAUDE.md` / `SKILL.md`, not hooks.

## Layer Boundaries

- Hook entry points should stay thin: parse input, call shared helpers, print the final message, and return the correct exit code.
- Shared behavior belongs in `.claude/hooks/lib/`, not duplicated across hook files.
- Project-specific paths and conventions come from `docs/project-config.json`, `.claude/.ck.json`, or project-reference docs.
- Generated mirrors (`.agents/`, `.codex/`, `AGENTS.md`) are not hook sources. Update canonical `.claude` sources, then sync mirrors.
- Workflow advancement is model-driven — there is no step-tracking hook; correctness must not depend on any tracker.

## Context Injection

Universal project guidance lives statically in `CLAUDE.md`, `.claude/agents/*.md`, and skill `SKILL.md` files so Claude and Codex read identical instructions. The workflow route gate is static; `workflow-route-inject.cjs` is its default-on runtime accelerator for the live catalog, with tracked team opt-out and a developer-local runtime override. Any hook that emits context should inject only the guidance needed for the current event, prefer a read-on-demand pointer over whole files for large references, and use stable dedup state when it can fire repeatedly in one session.

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
