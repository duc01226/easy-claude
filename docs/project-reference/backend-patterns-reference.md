# Backend Patterns Reference

<!-- Last scanned: 2026-03-15 -->
<!-- This file is referenced by Claude skills and agents for project-specific context. -->

> **Context:** easy-claude is a Claude Code enhancement framework. The "backend" equivalent is **CJS hook modules** under `.claude/hooks/` and `.claude/hooks/lib/`. There are no traditional backend services, APIs, or databases.

---

## 1. Hook Architecture

### 1.1 Hook Lifecycle

Hooks are standalone Node.js CJS scripts triggered by Claude Code at specific lifecycle events. Each hook is a short-lived process that:

1. Reads JSON from **stdin** (event payload from Claude Code)
2. Processes the event (validate, inject context, block, track state)
3. Writes output to **stdout** (injected into conversation context) or **stderr** (debug/user-visible messages)
4. Exits with a code signaling the outcome

### 1.2 Exit Code Convention

| Exit Code | Meaning                        | Used By                                               |
| --------- | ------------------------------ | ----------------------------------------------------- |
| `0`       | Allow / success (non-blocking) | All hooks (default)                                   |
| `1`       | Soft block with message        | `edit-enforcement`, `skill-enforcement`               |
| `2`       | Hard block (action rejected)   | `privacy-block`, `path-boundary-block`, `scout-block` |

**Fail-open principle:** On uncaught errors, hooks exit `0` to avoid blocking Claude. Errors log to stderr.

### 1.3 Hook Event Types

| Event              | When Fired                      | Example Hooks                                                                  |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------------ |
| `SessionStart`     | startup, resume, clear, compact | `session-init`, `workflow-router`                                              |
| `SessionEnd`       | Session closing                 | `session-end`                                                                  |
| `UserPromptSubmit` | Each user message               | `workflow-router`, `prompt-context-assembler`                                  |
| `SubagentStart`    | Subagent spawn                  | `subagent-init-identity`, `subagent-init-*.cjs` (13 hooks)                     |
| `PreToolUse`       | Before tool execution           | `privacy-block`, `path-boundary-block`, `edit-enforcement`, `frontend-context` |
| `PostToolUse`      | After tool execution            | `tool-output-swap`, `todo-tracker`                                             |
| `PreCompact`       | Before context compaction       | `write-compact-marker`                                                         |
| `Notification`     | System notifications            | Various                                                                        |

### 1.4 Stdin JSON Payload Structure

```js
// PreToolUse example
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Edit",              // Tool being invoked
  "tool_input": { "file_path": "..." }, // Tool arguments
  "tool_result": "",                 // Empty for PreToolUse
  "session_id": "abc-123",
  "transcript_path": "/tmp/...",     // Path to conversation transcript
  "cwd": "/project/root"
}
```

---

## 2. Hook Composition Patterns

### 2.1 Pattern A: `runHook` Wrapper (Recommended)

Uses `lib/hook-runner.cjs` for automatic stdin parsing, timeout protection, and error handling.

```js
const { runHook } = require('./lib/hook-runner.cjs');

runHook(
    'my-hook',
    async event => {
        const { toolName, toolInput, sessionId } = event;
        // ... logic ...
        console.log('Context to inject'); // stdout → conversation
    },
    { outputResult: false }
);
```

Variants: `runHookSync` (synchronous), `runBlockingHook` (validator returning `{ allowed, message }`).

### 2.2 Pattern B: Direct Stdin Read (Legacy/Security Hooks)

Used by security-critical hooks (`privacy-block`, `path-boundary-block`) that need full control.

```js
async function main() {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const hookData = JSON.parse(input);
    // ... validation logic ...
    if (blocked) {
        console.error(message);
        process.exit(2);
    }
    process.exit(0);
}
main().catch(() => process.exit(0)); // Fail-open
```

### 2.3 Pattern C: Context Injector Base

Used by context injection hooks (`frontend-context`, `backend-context`, `scss-styling-context`, `knowledge-context`) via `lib/context-injector-base.cjs`.

```js
const { parsePreToolUseInput, wasRecentlyInjected } = require('./lib/context-injector-base.cjs');

const input = parsePreToolUseInput(); // Returns null if wrong tool/no path
if (!input) process.exit(0);
if (wasRecentlyInjected(transcriptPath, MARKER, WINDOW)) process.exit(0);
console.log(buildInjection(input)); // Inject context
process.exit(0);
```

### 2.4 Pattern D: `require.main === module` Guard

Hooks that export functions for testing and for use by other hooks use this guard to prevent main execution on `require()`.

```js
module.exports = { buildCatalog, buildInjection };
if (require.main === module) {
    main();
}
```

---

## 3. Library Module Patterns (`.claude/hooks/lib/`)

### 3.1 Module Categories

| Category      | Modules                                                                                              | Purpose                                              |
| ------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Stdin/IO**  | `stdin-parser`, `debug-log`                                                                          | Input parsing, debug output to stderr                |
| **Execution** | `hook-runner`                                                                                        | Wrap hooks with timeout, error handling, exit codes  |
| **Config**    | `ck-config-loader`, `ck-config-utils`, `project-config-loader`, `project-config-schema`, `wr-config` | Cascading config resolution, project detection       |
| **Paths**     | `ck-paths`, `ck-path-utils`                                                                          | Centralized `/tmp/ck/` namespace, path normalization |
| **State**     | `ck-session-state`, `workflow-state`, `edit-state`, `todo-state`, `context-tracker`                  | Session-scoped persistence in temp files             |
| **Injection** | `context-injector-base`, `prompt-injections`, `dedup-constants`                                      | Shared context injection with dedup                  |
| **Engine**    | `swap-engine`                                                                                        | External memory swap (large output externalization)  |
| **Plan**      | `ck-plan-resolver`, `ck-git-utils`, `ck-env-utils`                                                   | Plan naming resolution, git/env helpers              |

### 3.2 Config Cascading Resolution

`ck-config-loader.cjs` implements three-layer config:

```
DEFAULT_CONFIG (hardcoded) → ~/.claude/.ck.json (global) → .claude/.ck.json (local)
```

Deep merge with "local wins" semantics. Arrays replace entirely (not concatenated).

`project-config-loader.cjs` loads `docs/project-config.json` with process-lifetime caching:

```js
let _cache = null;
function loadProjectConfig() {
    if (_cache) return _cache;
    _cache = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return _cache;
}
```

### 3.3 Centralized Path Namespace

All temp files go under `/tmp/ck/` via `ck-paths.cjs`:

```
/tmp/ck/
  markers/{sessionId}.json      — Session markers
  session/{sessionId}.json      — Session state
  workflow/{sessionId}.json     — Workflow state
  swap/{sessionId}/             — External memory swap files
  debug/{sessionId}.log         — Debug logs
  calibration.json              — Global calibration data
```

### 3.4 Dedup System

`dedup-constants.cjs` provides centralized markers and dynamically computed transcript window sizes to prevent duplicate context injection. Each hook checks whether its marker string appears in the last N lines of the transcript before injecting.

```js
const { FRONTEND_CONTEXT: MARKER, DEDUP_LINES } = require('./lib/dedup-constants.cjs');

if (wasRecentlyInjected(transcriptPath, MARKER, DEDUP_LINES.FRONTEND_CONTEXT)) {
    process.exit(0); // Already injected, skip
}
```

Window sizes are computed from actual file sizes (for file-based injections) or fixed values (for template injections). All dedup line counts are imported from this single module -- never hardcoded.

---

## 4. State Management Patterns

### 4.1 Atomic File Writes

State modules use write-to-temp-then-rename for crash safety:

```js
function saveState(sessionId, state) {
    const statePath = getPath(sessionId);
    const tmpFile = statePath + '.' + Math.random().toString(36).slice(2);
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2));
    fs.renameSync(tmpFile, statePath); // Atomic on same filesystem
}
```

### 4.2 File-Based Locking

`swap-engine.cjs` uses exclusive file creation for cross-process locking:

```js
fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' }); // Fails if exists
// ... critical section ...
fs.unlinkSync(lockPath); // Release
```

Includes stale lock detection (5-second timeout) to prevent deadlocks.

### 4.3 Session-Scoped State

State is always keyed by `sessionId` to prevent cross-session contamination. Example modules: `ck-session-state`, `workflow-state`, `edit-state`, `todo-state`.

---

## 5. Error Handling Patterns

### 5.1 Fail-Open (Default)

All hooks default to exit `0` on error to avoid blocking Claude:

```js
try {
    // Hook logic
} catch (error) {
    console.error(`[hook-name] Error: ${error.message}`);
    process.exit(0); // Allow operation to proceed
}
```

### 5.2 Debug-Gated Logging

`debug-log.cjs` gates verbose output behind `CK_DEBUG=1`:

- `debug(context, ...args)` — Logs to stderr only when `CK_DEBUG` is enabled
- `debugError(context, error)` — Debug-gated error with stack trace
- `logError(context, error)` — Always logs (for critical errors)

All debug output goes to **stderr** to avoid contaminating stdout (which is injected into conversation context).

### 5.3 Timeout Protection

`hook-runner.cjs` wraps async handlers with `Promise.race` against a 15-second timeout:

```js
const result = timeout > 0 ? await Promise.race([handlerPromise, timeoutPromise(timeout, name)]) : await handlerPromise;
```

On timeout, hooks exit `0` (fail-open).

### 5.4 Graceful Degradation in Shell Commands

`session-init.cjs` uses `execSafe` and `execFileSafe` wrappers with timeouts for external commands (git, python):

```js
function execSafe(cmd, timeoutMs = 5000) {
  try { return execSync(cmd, { timeout: timeoutMs, ... }).trim(); }
  catch { return null; }
}
```

---

## 6. Security Patterns

### 6.1 Privacy Block (`privacy-block.cjs`)

Blocks access to sensitive files (`.env`, credentials, private keys) with user-override via `APPROVED:` prefix.

### 6.2 Path Boundary Block (`path-boundary-block.cjs`)

Restricts file access to project root. No user override (security-critical). Handles URI decoding, MSYS path conversion, symlink resolution, and configurable allowlist.

---

## 7. Testing Patterns

### 7.1 Test Infrastructure

- **Test runner:** `node .claude/hooks/tests/test-all-hooks.cjs` — Custom runner (no external framework)
- **Test suites:** `.claude/hooks/tests/suites/*.test.cjs` — Organized by category (integration, security, workflow, lifecycle, context, etc.)
- **Assertions:** `.claude/hooks/tests/lib/assertions.cjs` — Custom assertion library (`assertEqual`, `assertBlocked`, `assertAllowed`, `assertContains`, etc.)
- **Hook runner:** `.claude/hooks/tests/lib/hook-runner.cjs` — Spawns hooks as child processes with JSON stdin, captures stdout/stderr/exit code
- **Test utilities:** `.claude/hooks/tests/lib/test-utils.cjs` — Temp dir management, mock config setup, state file helpers, env variable save/restore

### 7.2 Test Execution Pattern

Tests spawn hooks as child processes with JSON piped to stdin, then assert on exit code and output:

```js
const result = await runHook(hookPath, createPreToolUseInput('Read', { file_path: '.env' }));
assertBlocked(result.code, 'Should block .env access');
assertContains(result.stderr, 'PRIVACY BLOCK');
```

### 7.3 Test Isolation

- Each test creates a temporary directory (`fs.mkdtempSync`) and cleans up after
- Environment variables are saved/restored via `createEnvSaver()`
- State files are written to temp directories, not production paths
- Session IDs include timestamps to prevent cross-test contamination

### 7.4 Integration Test Chains

Tests verify multi-hook interactions by running hooks in sequence or parallel:

```js
// Sequence: stops at first block
const results = await runHookSequence([PRIVACY_BLOCK, SCOUT_BLOCK], input);

// Parallel: runs all, checks consistency
const results = await runHooksParallel([
    { hookPath: PRIVACY_BLOCK, input: legitInput },
    { hookPath: PRIVACY_BLOCK, input: blockedInput }
]);
```

### 7.5 Module Export for Testing

Hooks export internal functions for unit testing while using `require.main === module` or `module.exports` at the bottom:

```js
// Export functions for unit testing
module.exports = { isSafeFile, isPrivacySensitive, extractPaths };
```
