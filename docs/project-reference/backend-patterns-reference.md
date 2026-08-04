# Backend Patterns Reference

<!-- Last scanned: 2026-08-04 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

> **Goal:** Keep hook-oriented backend guidance aligned with verified easy-claude runtime contracts and mark unsupported server-side patterns explicitly.

> **Context:** easy-claude is a Claude Code enhancement framework. The "backend" equivalent is **CJS hook modules** under `.claude/hooks/` and `.claude/hooks/lib/`. There are no traditional backend services, APIs, or databases.

---

## Quick Summary

- Treat lifecycle hooks and focused CommonJS libraries as this repository's backend boundary.
- Keep state ownership, parsing, validation, and configuration in their existing focused modules.
- Treat CQRS, HTTP APIs, ORM repositories, message buses, DI containers, migrations, and schedulers as **N/A** until source evidence proves otherwise.

## Workflow

1. Read `docs/project-config.json` and the relevant hook registration in `.claude/settings.json`.
2. Trace the entry hook into `.claude/hooks/lib/` and verify every cited source range.
3. Reuse the established fail-open/fail-closed contract and run the configured hook test suite.

## Key Rules

- **MUST** keep file-backed state loading, normalization, and atomic persistence in its owning state module.
- **MUST** preserve each registered gate's documented stdout/stderr and exit-code contract.
- **NEVER** invent web-service, database, CQRS, DI, bus, migration, or job conventions absent from source.

## Repository Pattern

Traditional repository/ORM pattern: **N/A**. Hook state/config modules own file-backed retrieval and persistence (`docs/project-config.json:23-73`, `docs/project-config.json:149-152`). Keep storage/path/normalization logic inside the focused module, not hook entry points.

```js
function loadState(sessionId) {
    if (!sessionId) return getDefaultState();
    const statePath = getWorkflowPath(sessionId);
    try {
        if (!fs.existsSync(statePath)) return getDefaultState();
        const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        return { ...getDefaultState(), ...data };
    } catch (e) {
        return getDefaultState();
    }
}
```

Source: `.claude/hooks/lib/workflow-state.cjs:54-64`.

## CQRS Patterns

Traditional CQRS, command/query handlers, controllers, pagination, projection, and HTTP result wrappers: **N/A**. Actual request path: `.claude/settings.json` event matcher → hook process stdin → parser/handler or direct security gate → stdout/stderr → exit code (`.claude/settings.json:32-209`, `.claude/hooks/lib/stdin-parser.cjs:78-91`). `runHook` executes one supplied handler; it is not a CQRS dispatcher (`.claude/hooks/lib/hook-runner.cjs:65-92`).

## Validation Patterns

Reusable validator contract: `{ allowed, message? }`; rejection writes stderr and exits `2`, while success/error/timeout remains fail-open `0` (`.claude/hooks/lib/hook-runner.cjs:135-175`). Registered security gates currently own raw parsing/exit behavior directly (`.claude/settings.json:64-130`).

```js
if (result && result.allowed === false) {
    if (result.message) {
        process.stderr.write(result.message);
    }
    debug(name, "Hook blocked execution");
    process.exit(2);
}
```

Source: `.claude/hooks/lib/hook-runner.cjs:161-168`.

## Entity Patterns

ORM/domain entities: **N/A**. State modules use plain-object schemas and session-keyed JSON; the owning module supplies defaults, normalization, and atomic persistence (`.claude/hooks/lib/workflow-state.cjs:31-98`, `.claude/hooks/lib/todo-state.cjs:35-105`, `.claude/hooks/lib/ck-session-state.cjs:24-67`).

## DTO Mapping

Transport DTO layer: **N/A**. `parseHookEvent` owns raw snake-case event normalization into handler-friendly fields while retaining `raw` (`.claude/hooks/lib/stdin-parser.cjs:78-91`). State/config modules serialize their own plain objects.

## Event Handlers

Events are Claude lifecycle contracts, not domain/integration events: `Notification`, `PostToolUse`, `PreToolUse`, `SessionEnd`, `SessionStart`, `Stop`, and `UserPromptSubmit` (`.claude/settings.json:32-209`). Handlers are short-lived Node processes; wrapper handlers may be sync/async and default to a 15-second fail-open timeout (`.claude/hooks/lib/hook-runner.cjs:26-92`).

## Message Bus

Message bus/publisher/consumer convention: **N/A** (`docs/project-config.json:149-152`). Notifications are the only external side-effect channel: desktop plus configured Telegram/Discord/Slack providers. Desktop failures are isolated; external-provider failures are isolated and throttled (`.claude/hooks/notifications/notify.cjs:130-216`, `.claude/hooks/notifications/lib/sender.cjs:88-125`).

## DI & Configuration

DI container/lifetimes: **N/A**. Configuration uses JSON registration and focused CommonJS imports: hook commands/matchers in `.claude/settings.json:32-209`; project module/config map in `docs/project-config.json:23-148`; cached config queries in `.claude/hooks/lib/project-config-loader.cjs:53-69` and `:227-243`.

## Migrations

Database/schema migrations: **N/A**. No database or ORM configured (`docs/project-config.json:149-152`, `package.json:2-18`).

## Background Jobs

Scheduler/recurring job framework: **N/A**. Hooks run only for registered lifecycle events. Notification sends are awaited sequentially and always fail open; they are not queued jobs (`.claude/hooks/notifications/notify.cjs:130-216`).

## Authorization

No identity/role/policy layer. Operation authorization lives at `PreToolUse` matcher boundaries, static permissions, per-request approval/commit markers, and resolved project path boundaries (`.claude/settings.json:64-130`, `.claude/settings.json:212-265`, `.claude/hooks/privacy-block.cjs:226-239`, `.claude/hooks/git-commit-block.cjs:139-160`, `.claude/hooks/path-boundary-block.cjs:409-444`).

## Anti-Patterns

No violation exceeded the 80% evidence threshold. Direct security gates and reusable `runBlockingHook` coexist in current source; non-adoption alone does not prove a defect (`.claude/hooks/lib/hook-runner.cjs:135-181`, `.claude/settings.json:64-130`). Do not force a wrapper refactor without a demonstrated correctness, cleanup, or configuration failure.

## Closing Reminders

- **MUST** trace the registered lifecycle path before changing a hook contract.
- **MUST** verify every path, declaration, and code sample against current source.
- **NEVER** replace evidence-backed **N/A** findings with generic backend boilerplate.

> **Goal:** Keep hook-oriented backend guidance aligned with verified easy-claude runtime contracts and mark unsupported server-side patterns explicitly.
