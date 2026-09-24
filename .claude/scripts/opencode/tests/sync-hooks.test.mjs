import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildHooksConfig,
  checkOpencodeHooks,
  extractHookPath,
  materializeOpencodeHooks,
  pruneLegacyNotification,
  renderPlugin,
} from "../sync-hooks.mjs";

const HOOK_SCRIPTS = {
  "block.cjs": [
    "process.stdin.resume();",
    "process.stdin.on('end', () => { process.stderr.write('blocked: git commit forbidden\\n'); process.exit(2); });",
  ].join("\n"),
  "rewrite.cjs": [
    "process.stdin.resume();",
    "process.stdin.on('end', () => { process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: { command: 'echo safe' } } })); });",
  ].join("\n"),
  "context.cjs": [
    "process.stdin.resume();",
    "process.stdin.on('end', () => { process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'HELLO_CONTEXT' } })); });",
  ].join("\n"),
  "session.cjs": [
    "process.stdin.resume();",
    "process.stdin.on('end', () => { process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'SESSION_CTX' } })); });",
  ].join("\n"),
  "prompt.cjs": [
    "process.stdin.resume();",
    "process.stdin.on('end', () => { process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: 'PROMPT_CTX' } })); });",
  ].join("\n"),
  // Claude Code treats exit-0 plain-text UserPromptSubmit stdout as prompt context.
  "prompt-plain.cjs": [
    "process.stdin.resume();",
    "process.stdin.on('end', () => { process.stdout.write('\\n  PLAIN_PROMPT_CTX\\n'); });",
  ].join("\n"),
  "prompt-blank.cjs": [
    "process.stdin.resume();",
    "process.stdin.on('end', () => { process.stdout.write(' \\n\\t\\n'); });",
  ].join("\n"),
  // A JSON object is hook-control output, never raw prompt text.
  "prompt-decision.cjs": [
    "process.stdin.resume();",
    "process.stdin.on('end', () => { process.stdout.write(JSON.stringify({ decision: 'approve', reason: 'DECISION_JSON_TEXT' })); });",
  ].join("\n"),
  // A non-zero, non-blocking exit is an error: its stdout is not context.
  "prompt-error.cjs": [
    "process.stdin.resume();",
    "process.stdin.on('end', () => { process.stdout.write('ERROR_EXIT_TEXT'); process.exit(1); });",
  ].join("\n"),
  "record.cjs": [
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    "let raw = '';",
    "process.stdin.on('data', (chunk) => { raw += chunk.toString(); });",
    "process.stdin.on('end', () => {",
    "  const dir = path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), 'tmp');",
    "  fs.mkdirSync(dir, { recursive: true });",
    "  fs.writeFileSync(path.join(dir, 'hook-payload.json'), raw);",
    "});",
  ].join("\n"),
  // Appends every payload it receives, so a test can prove each forwarded event separately.
  "record-all.cjs": [
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    "let raw = '';",
    "process.stdin.on('data', (chunk) => { raw += chunk.toString(); });",
    "process.stdin.on('end', () => {",
    "  const dir = path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), 'tmp');",
    "  fs.mkdirSync(dir, { recursive: true });",
    "  fs.appendFileSync(path.join(dir, 'hook-payloads.jsonl'), JSON.stringify(JSON.parse(raw)) + '\\n');",
    "});",
  ].join("\n"),
};

const NOTIFY_ROUTER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../hooks/notifications/notify.cjs");

async function readRecordedPayloads(root) {
  const text = await fs.readFile(path.join(root, "tmp", "hook-payloads.jsonl"), "utf8");
  return text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

// Run the real notification router on a recorded bridge payload with every remote
// channel blanked, desktop alerts off and a throwaway home, so nothing is delivered.
function routeThroughRealRouter(payload, isolatedHome) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(TELEGRAM|DISCORD|SLACK)_/.test(key)) env[key] = "";
  }
  Object.assign(env, {
    ENABLE_DESKTOP_NOTIFICATIONS: "false",
    CLAUDE_HOOK_TEST_MODE: "1",
    HOME: isolatedHome,
    USERPROFILE: isolatedHome,
  });
  const result = spawnSync(process.execPath, [NOTIFY_ROUTER], {
    input: JSON.stringify({ ...payload, cwd: isolatedHome }),
    cwd: isolatedHome,
    env,
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.status, 0, `router must exit 0: ${result.stderr}`);
  return result.stderr;
}

function hookCommand(script) {
  return `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/${script}`;
}

function defaultSettings() {
  return {
    hooks: {
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: hookCommand("block.cjs") }] },
        { matcher: "Edit|Write", hooks: [{ type: "command", command: hookCommand("rewrite.cjs") }] },
      ],
      PostToolUse: [
        { matcher: "Edit|Write|MultiEdit", hooks: [{ type: "command", command: hookCommand("context.cjs") }] },
      ],
      UserPromptSubmit: [{ hooks: [{ type: "command", command: hookCommand("prompt.cjs") }] }],
      SessionStart: [
        { matcher: "startup|resume|clear|compact", hooks: [{ type: "command", command: hookCommand("session.cjs") }] },
      ],
      Notification: [
        { matcher: "AskUserPrompt|permission_prompt", hooks: [{ type: "command", command: hookCommand("record.cjs") }] },
      ],
    },
  };
}

async function createProject(settings = defaultSettings()) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-sync-"));
  await fs.mkdir(path.join(root, ".claude", "hooks"), { recursive: true });
  await fs.writeFile(path.join(root, ".claude", "settings.json"), `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  for (const [name, body] of Object.entries(HOOK_SCRIPTS)) {
    await fs.writeFile(path.join(root, ".claude", "hooks", name), `${body}\n`, "utf8");
  }
  return root;
}

async function loadBridge(pluginPath) {
  const module = await import(`${pathToFileURL(pluginPath).href}?t=${Date.now()}-${Math.random()}`);
  assert.equal(typeof module.EasyClaudeHooks, "function", "generated plugin must export EasyClaudeHooks");
  return module.EasyClaudeHooks;
}

test("extractHookPath parses node $CLAUDE_PROJECT_DIR hook commands", () => {
  assert.equal(extractHookPath(hookCommand("review-commit-gate.cjs")), ".claude/hooks/review-commit-gate.cjs");
  assert.equal(
    extractHookPath('node "${CLAUDE_PROJECT_DIR}"/.claude/hooks/session-init.cjs'),
    ".claude/hooks/session-init.cjs"
  );
  assert.equal(extractHookPath("python .claude/scripts/other.py"), null);
  assert.equal(extractHookPath(""), null);
});

test("buildHooksConfig compiles supported events and reports the unsupported ones", () => {
  const { hooks, report } = buildHooksConfig({
    hooks: {
      PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: hookCommand("a.cjs") }] }],
      SubagentStop: [{ hooks: [{ type: "command", command: hookCommand("b.cjs") }] }],
      SessionEnd: [{ matcher: "clear", hooks: [{ type: "command", command: "bash run.sh" }] }],
    },
  });

  assert.deepEqual(Object.keys(hooks), ["PreToolUse"]);
  assert.equal(hooks.PreToolUse[0].matcher, "Bash");
  assert.deepEqual(hooks.PreToolUse[0].hooks, [{ type: "command", command: ".claude/hooks/a.cjs" }]);
  assert.deepEqual(report.skipped_events, [
    { event: "SubagentStop", reason: "unsupported-by-opencode" },
    { event: "SessionEnd", reason: "no-compatible-groups-after-filtering" },
  ]);
  assert.deepEqual(report.skipped_groups, [
    { event: "SessionEnd", group_index: 0, matcher: "clear", reason: "unsupported-command-shape" },
  ]);
});

test("renderPlugin substitutes the HOOKS placeholder and is deterministic", async () => {
  const template = "const HOOKS = __EASY_CLAUDE_HOOKS__;\nexport const x = 1;\n";
  const first = renderPlugin({ PreToolUse: [] }, template);
  const second = renderPlugin({ PreToolUse: [] }, template);
  assert.equal(first, second);
  assert.ok(first.includes('"PreToolUse"'));
  assert.ok(!first.includes("__EASY_CLAUDE_HOOKS__"));
  assert.throws(() => renderPlugin({}, "no placeholder"), /placeholder/);
});

test("materializeOpencodeHooks writes the plugin, report, and is idempotent", async () => {
  const root = await createProject();
  try {
    const first = await materializeOpencodeHooks({ rootDir: root });
    const second = await materializeOpencodeHooks({ rootDir: root });
    assert.equal(first.pluginText, second.pluginText, "re-materializing must be byte-stable");
    assert.equal(first.report.missing_hook_files.length, 0);
    assert.equal(first.report.hooks_total, 6);
    assert.equal(first.report.converted_events.length, 5);
    const onDisk = await fs.readFile(first.pluginPath, "utf8");
    assert.equal(onDisk, first.pluginText);

    const check = await checkOpencodeHooks({ rootDir: root });
    assert.equal(check.ok, true, check.reason ?? "");
    await fs.appendFile(first.pluginPath, "\n// drift\n", "utf8");
    const drifted = await checkOpencodeHooks({ rootDir: root });
    assert.equal(drifted.ok, false);
    assert.match(drifted.reason, /stale/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("pruneLegacyNotification backs up then removes the legacy plugin", async () => {
  const root = await createProject();
  const legacyDir = path.join(root, ".opencode", "plugins");
  await fs.mkdir(legacyDir, { recursive: true });
  const legacy = path.join(legacyDir, "notification.js");
  await fs.writeFile(legacy, "export const Legacy = 1;\n", "utf8");
  try {
    const result = await pruneLegacyNotification({ rootDir: root });
    assert.equal(result.removed, true);
    assert.equal(await fs.readFile(result.backup, "utf8"), "export const Legacy = 1;\n");
    await assert.rejects(fs.access(legacy));
    const second = await pruneLegacyNotification({ rootDir: root });
    assert.equal(second.removed, false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge blocks PreToolUse via exit code 2", async () => {
  const root = await createProject();
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });
    await assert.rejects(
      hooks["tool.execute.before"]({ tool: "bash", sessionID: "s1", callID: "c1" }, { args: { command: "git commit -m x" } }),
      /blocked: git commit forbidden/
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge leaves non-matching tools untouched and rewrites matching args", async () => {
  const root = await createProject();
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    const readOutput = { args: { filePath: "a.ts" } };
    await hooks["tool.execute.before"]({ tool: "read", sessionID: "s1", callID: "c1" }, readOutput);
    assert.deepEqual(readOutput.args, { filePath: "a.ts" });

    const editOutput = { args: { filePath: "a.ts", oldString: "x", newString: "y" } };
    await hooks["tool.execute.before"]({ tool: "edit", sessionID: "s1", callID: "c2" }, editOutput);
    assert.equal(editOutput.args.command, "echo safe");
    assert.equal(editOutput.args.filePath, "a.ts");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge appends PostToolUse additionalContext to tool output", async () => {
  const root = await createProject();
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });
    const output = { title: "edit", output: "done", metadata: {} };
    await hooks["tool.execute.after"]({ tool: "edit", sessionID: "s1", callID: "c1", args: {} }, output);
    assert.match(output.output, /done\n\nHELLO_CONTEXT/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge injects UserPromptSubmit context and SessionStart system context", async () => {
  const root = await createProject();
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    const message = { parts: [{ type: "text", text: "hello" }] };
    await hooks["chat.message"]({ sessionID: "s1" }, message);
    assert.ok(message.parts.some((part) => part.text === "PROMPT_CTX" && part.synthetic === true));

    const system = { system: ["base"] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "s1" }, system);
    assert.deepEqual(system.system, ["base", "SESSION_CTX"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge injects plain-text UserPromptSubmit stdout as context, keeps JSON handling, and ignores blank output", async () => {
  // Given UserPromptSubmit hooks emitting plain text, hook JSON, blank output, a JSON
  // control object without context, and plain text on a non-zero exit
  const settings = {
    hooks: {
      UserPromptSubmit: [
        { hooks: [{ type: "command", command: hookCommand("prompt-plain.cjs") }] },
        { hooks: [{ type: "command", command: hookCommand("prompt.cjs") }] },
        { hooks: [{ type: "command", command: hookCommand("prompt-blank.cjs") }] },
        { hooks: [{ type: "command", command: hookCommand("prompt-decision.cjs") }] },
        { hooks: [{ type: "command", command: hookCommand("prompt-error.cjs") }] },
      ],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    // When a user message goes through the real generated bridge
    const message = { parts: [{ type: "text", text: "hello" }] };
    await hooks["chat.message"]({ sessionID: "s1" }, message);

    // Then exactly the trimmed plain text and the JSON additionalContext are injected, in hook order
    const injected = message.parts.filter((part) => part.synthetic === true).map((part) => part.text);
    assert.deepEqual(injected, ["PLAIN_PROMPT_CTX", "PROMPT_CTX"]);
    assert.equal(message.parts[0].text, "hello", "the user's own text part is preserved");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge injects nothing when every UserPromptSubmit hook prints nothing", async () => {
  const settings = {
    hooks: {
      UserPromptSubmit: [{ hooks: [{ type: "command", command: hookCommand("prompt-blank.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    const message = { parts: [{ type: "text", text: "hello" }] };
    await hooks["chat.message"]({ sessionID: "s1" }, message);
    assert.deepEqual(message.parts, [{ type: "text", text: "hello" }]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge runs the canonical Git capability hook with validated child environment augmentation", async () => {
  const settings = {
    hooks: {
      SessionStart: [
        {
          matcher: "startup|resume|clear|compact",
          hooks: [{ type: "command", command: hookCommand("verify-install.cjs") }],
        },
      ],
    },
  };
  const root = await createProject(settings);
  try {
    await fs.mkdir(path.join(root, ".claude", "hooks", "lib"), { recursive: true });
    await fs.writeFile(
      path.join(root, ".claude", "hooks", "lib", "windows-git.cjs"),
      `module.exports = {
  OUTCOMES: { READY: "ready" },
  resolveWindowsGit: () => ({ outcome: "ready", capability: { root: "C:\\\\Program Files\\\\Git" } }),
  withGitEnvironment: (env) => {
    const pathKey = Object.keys(env).find(key => key.toLowerCase() === "path") || "PATH";
    return { ...env, [pathKey]: "C:\\\\Program Files\\\\Git\\\\cmd;" + (env[pathKey] || ""), CK_GIT_EXE: "C:\\\\Program Files\\\\Git\\\\cmd\\\\git.exe" };
  }
};\n`,
      "utf8"
    );
    await fs.writeFile(
      path.join(root, ".claude", "hooks", "verify-install.cjs"),
      `const fs = require("node:fs");
const path = require("node:path");
let input = "";
process.stdin.on("data", chunk => { input += chunk.toString(); });
process.stdin.on("end", () => {
  fs.mkdirSync(path.join(process.env.CLAUDE_PROJECT_DIR, "tmp"), { recursive: true });
  fs.writeFileSync(path.join(process.env.CLAUDE_PROJECT_DIR, "tmp", "git-child-env.json"), JSON.stringify({
    root: process.env.CLAUDE_PROJECT_DIR,
    git: process.env.CK_GIT_EXE,
    path: process.env.PATH,
    input
  }));
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: "GIT_READY" } }));
});\n`,
      "utf8"
    );

    const { pluginPath, pluginText, report } = await materializeOpencodeHooks({ rootDir: root });
    assert.match(pluginText, /verify-install\.cjs/);
    assert.match(pluginText, /windows-git\.cjs/);
    assert.match(pluginText, /withGitEnvironment/);
    assert.equal(report.converted_events[0].event, "SessionStart");
    assert.equal(report.hooks_total, 1);

    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });
    await hooks.event({ event: { type: "session.created", properties: { sessionID: "s-git" } } });

    const observed = JSON.parse(await fs.readFile(path.join(root, "tmp", "git-child-env.json"), "utf8"));
    assert.equal(observed.root, root);
    assert.equal(observed.git, "C:\\Program Files\\Git\\cmd\\git.exe");
    assert.match(observed.path, /^C:\\Program Files\\Git\\cmd;/);
    assert.match(observed.input, /"hook_event_name":"SessionStart"/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("[TC-NT-011] generated bridge forwards question requests to the notification hook", async () => {
  // Given the generated bridge has a Notification hook registered for AskUserPrompt
  const root = await createProject();
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    // When OpenCode emits a question.asked event
    await hooks.event({ event: { type: "question.asked", properties: { sessionID: "s1" } } });
    const payload = JSON.parse(await fs.readFile(path.join(root, "tmp", "hook-payload.json"), "utf8"));
    // Then the question reaches the registered hook with its type, tool, and session preserved
    assert.equal(payload.hook_event_name, "AskUserPrompt");
    assert.equal(payload.tool_name, "AskUserQuestion");
    assert.equal(payload.session_id, "s1");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("[TC-NT-071] generated bridge forwards every SessionEnd for cleanup but marks delegated sessions so only the main one alerts", async () => {
  // Given the real generated OpenCode bridge with a SessionEnd hook configured for every reason
  const settings = {
    hooks: {
      SessionEnd: [{ hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    // When a delegated session is deleted (its parentID identifies it as non-main), then the main session
    await hooks.event({
      event: {
        type: "session.deleted",
        properties: { sessionID: "child-session", info: { id: "child-session", parentID: "main-session" } },
      },
    });
    await hooks.event({
      event: {
        type: "session.deleted",
        properties: { sessionID: "main-session", info: { id: "main-session" } },
      },
    });

    // Then both ends reach the SessionEnd hooks, so per-session cleanup runs for each
    const [delegated, main] = await readRecordedPayloads(root);
    assert.equal(delegated.hook_event_name, "SessionEnd");
    assert.equal(delegated.session_id, "child-session");
    assert.equal(delegated.reason, "exit", "cleanup keys full swap/snapshot removal off an exit reason");
    assert.equal(main.hook_event_name, "SessionEnd");
    assert.equal(main.session_id, "main-session");
    // And only the delegated end carries the delegated-conversation marker
    assert.equal(delegated.agent_id, "child-session");
    assert.equal(Object.hasOwn(main, "agent_id"), false, "the main session end must not look delegated");
    assert.equal(Object.hasOwn(main, "conversation_kind"), false, "the main session end is a known main conversation");

    // And the real notification router withholds the alert only for the delegated end
    assert.match(routeThroughRealRouter(delegated, root), /Skipped: subagent SessionEnd/);
    assert.doesNotMatch(routeThroughRealRouter(main, root), /Skipped/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("[TC-NT-071] generated bridge still runs SessionEnd cleanup when session metadata is missing but withholds the alert", async () => {
  // Given the real generated OpenCode bridge with a SessionEnd hook configured
  const settings = {
    hooks: {
      SessionEnd: [{ hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    // When a session is deleted without the metadata that says whether it was delegated
    await hooks.event({ event: { type: "session.deleted", properties: { sessionID: "unknown-session" } } });

    // Then SessionEnd is still forwarded, so per-session cleanup runs
    const [payload] = await readRecordedPayloads(root);
    assert.equal(payload.hook_event_name, "SessionEnd");
    assert.equal(payload.session_id, "unknown-session");
    assert.equal(payload.reason, "exit");
    // And it is marked as an unknown conversation kind rather than a main-session end
    assert.equal(payload.conversation_kind, "unknown");
    // And the real notification router raises no session-ended alert for it
    assert.match(routeThroughRealRouter(payload, root), /Skipped: SessionEnd for a conversation of unknown kind/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("[TC-NT-011] generated bridge defers only the question tool precursor so one question alert is raised", async () => {
  // Given the real generated OpenCode bridge with a PreToolUse hook for the question and shell tools
  const settings = {
    hooks: {
      PreToolUse: [{ matcher: "AskUserQuestion|Bash", hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    // When OpenCode runs its question tool, then an ordinary shell tool
    await hooks["tool.execute.before"]({ tool: "question", sessionID: "s-question" }, { args: {} });
    await hooks["tool.execute.before"]({ tool: "bash", sessionID: "s-question" }, { args: { command: "echo ok" } });

    // Then the question precursor is forwarded marked deferred, and the shell tool is not
    const [question, shell] = await readRecordedPayloads(root);
    assert.equal(question.tool_name, "AskUserQuestion");
    assert.equal(question.notification_deferred, true);
    assert.equal(shell.tool_name, "Bash");
    assert.equal(shell.notification_deferred, false);
    // And the real notification router skips the deferred precursor, leaving question.asked as the one alert
    assert.match(routeThroughRealRouter(question, root), /Skipped: deferred question precursor/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated plugin imports only node built-ins (portable)", async () => {
  const root = await createProject();
  try {
    const { pluginText } = await materializeOpencodeHooks({ rootDir: root });
    const imports = [...pluginText.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
    assert.ok(imports.length >= 2, "expected node built-in imports");
    for (const specifier of imports) {
      assert.ok(specifier.startsWith("node:"), `unexpected non-builtin import: ${specifier}`);
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
