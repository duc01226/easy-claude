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
  "pre-context.cjs": [
    "let raw = '';",
    "process.stdin.on('data', chunk => { raw += chunk; });",
    "process.stdin.on('end', () => { process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: JSON.parse(raw).tool_input.command } })); });",
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
  // Condition probes: each appends the file path it was started for to its own marker file.
  ...Object.fromEntries(["probe", "probe-unknown"].map((name) => [`${name}.cjs`, [
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    "let raw = '';",
    "process.stdin.on('data', (chunk) => { raw += chunk.toString(); });",
    "process.stdin.on('end', () => {",
    "  const dir = path.join(process.env.CLAUDE_PROJECT_DIR || process.cwd(), 'tmp');",
    "  fs.mkdirSync(dir, { recursive: true });",
    `  fs.appendFileSync(path.join(dir, '${name}.jsonl'), JSON.stringify(JSON.parse(raw).tool_input.file_path) + '\\n');`,
    "});",
  ].join("\n")])),
};

async function readMarkerLines(root, name) {
  try {
    return (await fs.readFile(path.join(root, "tmp", name), "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

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
    // Attendance markers inherited from the assistant session running the tests.
    CLAUDE_CODE_SESSION_ATTENDED: "",
    CLAUDE_CODE_SESSION_ID: "",
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

async function importPlugin(pluginPath) {
  return await import(`${pathToFileURL(pluginPath).href}?t=${Date.now()}-${Math.random()}`);
}

// A minimal opencode V2 plugin context: it records each domain hook registration and
// exposes a push-driven event stream, so a test can drive the real generated setup().
function createV2Host(root, sessions = {}, project = { directory: root, canonical: root }) {
  const registrations = { tool: {}, session: {}, permission: {} };
  const queue = [];
  let wake = null;
  let stopped = false;
  const source = {
    push(event) {
      queue.push(event);
      if (wake) {
        const resume = wake;
        wake = null;
        resume();
      }
    },
    async *subscribe({ signal } = {}) {
      signal?.addEventListener("abort", () => {
        stopped = true;
        if (wake) {
          const resume = wake;
          wake = null;
          resume();
        }
      }, { once: true });
      while (!stopped) {
        if (queue.length > 0) {
          yield queue.shift();
          continue;
        }
        await new Promise((resolve) => {
          wake = resolve;
        });
      }
    },
  };
  const ctx = {
    location: { directory: root, project },
    tool: {
      hook: async (name, callback) => {
        registrations.tool[name] = callback;
        return { dispose() {} };
      },
    },
    session: {
      hook: async (name, callback) => {
        registrations.session[name] = callback;
        return { dispose() {} };
      },
      get: async ({ sessionID }) => {
        const info = sessions[sessionID];
        if (info === null) throw new Error("session is gone");
        // A real session row always names the location it runs in. Tests can
        // override it explicitly; every other session therefore belongs here.
        return { id: sessionID, location: { directory: root }, ...(info || {}) };
      },
    },
    permission: {
      hook: async (name, callback) => {
        registrations.permission[name] = callback;
        return { dispose() {} };
      },
    },
    event: { subscribe: source.subscribe },
  };
  return { ctx, registrations, emit: source.push };
}

async function waitFor(check, message, timeout = 4000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await check()) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${message}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function recordedPayloadCount(root, count) {
  await waitFor(async () => {
    try {
      const text = await fs.readFile(path.join(root, "tmp", "hook-payloads.jsonl"), "utf8");
      return text.split("\n").filter(Boolean).length >= count;
    } catch {
      return false;
    }
  }, `${count} recorded hook payload(s)`);
  return readRecordedPayloads(root);
}

// The chat.message output opencode hands the plugin: every user part is already saved
// with its own id plus the message's sessionID and messageID.
function userMessage(text, { sessionID = "ses_test", messageID = "msg_test", partID = "prt_test" } = {}) {
  return {
    message: { id: messageID, sessionID, role: "user" },
    parts: [{ id: partID, sessionID, messageID, type: "text", text }],
  };
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

// TC-KNW-045 (third host) — spec KNW BR-KNW-20: the shipped settings give OpenCode the knowledge router on
// prompts (including `$skill` markers), typed commands, helper-agent starts, skill invocation, pack reads and
// compaction, so every event the hook is registered on reaches the same payload on both hosts.
test("TC-KNW-045: the third host registers the knowledge router for prompts, typed commands, helper-agent starts, skill starts, pack reads and compaction", async () => {
  const settingsFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "settings.json");
  const { hooks, report } = buildHooksConfig(JSON.parse(await fs.readFile(settingsFile, "utf8")));
  const registrations = Object.entries(hooks).flatMap(([event, groups]) => groups.flatMap(group => group.hooks
    .filter(hook => hook.command === ".claude/hooks/knowledge-route.cjs")
    .map(hook => `${event}:${group.matcher ?? "*"}${hook.if ? ` if ${hook.if}` : ""}`)));
  assert.deepEqual(registrations.sort(), [
    "PostToolUse:Read if Read(**/knowledge-base/*.md)",
    "PostToolUse:Skill",
    "SessionStart:compact",
    "SubagentStart:*",
    "UserPromptExpansion:*",
    "UserPromptSubmit:*",
  ]);
  const unsupported = report.skipped_events.map(entry => entry.event);
  for (const event of ["SubagentStart", "UserPromptExpansion", "PostToolUseFailure"]) {
    assert.equal(unsupported.includes(event), false, `${event} is bridged on the third host`);
  }
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

test("generated bridge delivers pre-tool context once after a blocked tool without changing args", async () => {
  const root = await createProject({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [
    { type: "command", command: hookCommand("context.cjs") },
    { type: "command", command: hookCommand("block.cjs") },
  ] }] } });
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });
    const args = { command: "fixture-command" };
    for (let index = 0; index < 2; index++) {
      await assert.rejects(hooks["tool.execute.before"]({ tool: "bash", sessionID: "blocked" }, { args }), /forbidden/);
    }
    assert.deepEqual(args, { command: "fixture-command" });
    const output = { system: [] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "blocked" }, output);
    assert.deepEqual(output.system, ["HELLO_CONTEXT"], "duplicate contexts have one model-facing delivery even after a block");
    const again = { system: [] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "blocked" }, again);
    assert.deepEqual(again.system, []);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge delivers pre-tool context with the completed tool's output and never again in the system prompt", async () => {
  const root = await createProject({ hooks: {
    PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: hookCommand("pre-context.cjs") }] }],
    PostToolUse: [{ matcher: "Bash", hooks: [
      { type: "command", command: hookCommand("record.cjs") },
      { type: "command", command: hookCommand("context.cjs") },
    ] }],
  } });
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });
    const before = (sessionID, command) => hooks["tool.execute.before"]({ tool: "bash", sessionID, callID: "c1" }, { args: { command } });
    const after = async (sessionID, text) => {
      const output = { title: "bash", output: text, metadata: {} };
      await hooks["tool.execute.after"]({ tool: "bash", sessionID, callID: "c1", args: {} }, output);
      return output.output;
    };
    const model = async sessionID => {
      const output = { system: [] };
      await hooks["experimental.chat.system.transform"]({ sessionID }, output);
      return output.system;
    };
    await before("completed", "PRE_CONTEXT");
    await before("bystander", "OTHER_SESSION");
    assert.equal(await after("completed", "done"), "done\n\nPRE_CONTEXT\n\nHELLO_CONTEXT", "tool output keeps pre-tool context in the conversation, ahead of post-tool context");
    const recorded = JSON.parse(await fs.readFile(path.join(root, "tmp", "hook-payload.json"), "utf8"));
    assert.equal(recorded.tool_response.output, "done", "PostToolUse hooks read the tool's own output, without bridge-added context");
    assert.deepEqual(await model("completed"), [], "context delivered with the tool output is not repeated in the next system prompt");
    assert.equal(await after("completed", "next"), "next\n\nHELLO_CONTEXT", "a later tool does not carry the context again");
    assert.deepEqual(await model("bystander"), ["OTHER_SESSION"], "a completed tool takes only its own session's pending context");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge keeps pre-tool context for the next system prompt when the tool result has no text output", async () => {
  const root = await createProject({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [
    { type: "command", command: hookCommand("pre-context.cjs") },
  ] }] } });
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });
    const call = { tool: "bash", sessionID: "no-text", args: {} };
    await hooks["tool.execute.before"](call, { args: { command: "PRE_CONTEXT" } });
    const result = { content: [] };
    await hooks["tool.execute.after"](call, result);
    assert.deepEqual(result, { content: [] }, "a result without text output is left as the host returned it");
    await hooks["tool.execute.after"](call, undefined);
    const system = { system: [] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "no-text" }, system);
    assert.deepEqual(system.system, ["PRE_CONTEXT"], "context no tool output carried still reaches the next model request");
    const later = { output: "done" };
    await hooks["tool.execute.after"](call, later);
    assert.equal(later.output, "done", "context the system prompt delivered is not added to a later tool output");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge bounds pending pre-tool text and sessions without mixing their context", async () => {
  const root = await createProject({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [
    { type: "command", command: hookCommand("pre-context.cjs") },
  ] }] } });
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });
    const before = (sessionID, command) => hooks["tool.execute.before"]({ tool: "bash", sessionID }, { args: { command } });
    const model = async sessionID => {
      const output = { system: [] };
      await hooks["experimental.chat.system.transform"]({ sessionID }, output);
      return output.system;
    };
    await before("bytes", "x".repeat(65536));
    await before("bytes", "over-limit");
    assert.deepEqual(await model("bytes"), ["x".repeat(65536)], "64KiB aggregate cap preserves accepted context");
    await before("oversize", "x".repeat(65537));
    assert.deepEqual(await model("oversize"), [], "one oversized context cannot occupy the queue");
    for (let index = 0; index < 33; index++) await before("count", `context-${index}`);
    assert.deepEqual(await model("count"), Array.from({ length: 32 }, (_, index) => `context-${index}`));
    for (let index = 0; index < 257; index++) await before(`session-${index}`, `context-${index}`);
    assert.deepEqual(await model("session-256"), [], "bounded queue diagnoses overflow instead of retaining unlimited sessions");
    assert.deepEqual(await model("session-0"), ["context-0"]);
    await before("after-drain", "new-context");
    assert.deepEqual(await model("after-drain"), ["new-context"], "consumption frees a session slot");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge discards pre-tool context still pending when its session compacts", async () => {
  const root = await createProject({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [
    { type: "command", command: hookCommand("pre-context.cjs") },
  ] }] } });
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });
    const before = (sessionID, command) => hooks["tool.execute.before"]({ tool: "bash", sessionID }, { args: { command } });
    const model = async sessionID => {
      const output = { system: [] };
      await hooks["experimental.chat.system.transform"]({ sessionID }, output);
      return output.system;
    };
    await before("compacting", "queued-before-compaction");
    await before("bystander", "other-session-context");
    await hooks.event({ event: { type: "session.compacted", properties: { sessionID: "compacting" } } });
    assert.deepEqual(await model("compacting"), [], "context queued before a compaction belongs to the window that was discarded");
    assert.deepEqual(await model("bystander"), ["other-session-context"], "another session's pending context survives that compaction");
    await before("compacting", "queued-after-compaction");
    assert.deepEqual(await model("compacting"), ["queued-after-compaction"], "the compacted session queues new context again");
    await before("compacting", "queued-before-second-compaction");
    await hooks.event({ event: { type: "session.compacted", properties: { sessionID: "compacting" } } });
    const completed = { output: "done" };
    await hooks["tool.execute.after"]({ tool: "bash", sessionID: "compacting", args: {} }, completed);
    assert.equal(completed.output, "done", "a tool that completes after the compaction does not carry the discarded context");
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

    const message = userMessage("hello", { sessionID: "s1" });
    await hooks["chat.message"]({ sessionID: "s1" }, message);
    assert.ok(message.parts.some((part) => part.text === "PROMPT_CTX" && part.synthetic === true));

    const system = { system: ["base"] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "s1" }, system);
    assert.deepEqual(system.system, ["base", "SESSION_CTX"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("TC-SAP-007 real policy reaches OpenCode main/child sessions, keeps commit routing and refreshes local changes", async () => {
  const policyCommand = hookCommand("skill-activation-inject.cjs");
  const root = await createProject({ hooks: {
    SessionStart: [{ matcher: "startup|resume|compact|clear", hooks: [{ type: "command", command: policyCommand }] }],
    UserPromptSubmit: [{ hooks: [{ type: "command", command: policyCommand }, { type: "command", command: hookCommand("commit-skill-route.cjs") }] }],
  } });
  const savedEnv = { ...process.env };
  try {
    // The bridge spawns canonical hooks in-process; scrub inherited settings/provider switches and
    // point the user config and every temporary root at this fixture, then restore them in finally.
    for (const key of Object.keys(process.env)) {
      if (/^(CK_|CLAUDE_|CODEX_|OPENCODE_|NODE_OPTIONS$|OPENAI_|ANTHROPIC_)/i.test(key)) delete process.env[key];
    }
    Object.assign(process.env, { HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root });
    const canonical = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
    await fs.cp(path.join(canonical, "hooks", "lib"), path.join(root, ".claude", "hooks", "lib"), { recursive: true });
    await fs.cp(path.join(canonical, "scripts", "lib"), path.join(root, ".claude", "scripts", "lib"), { recursive: true });
    for (const name of ["skill-activation-inject.cjs", "commit-skill-route.cjs"]) {
      await fs.copyFile(path.join(canonical, "hooks", name), path.join(root, ".claude", "hooks", name));
    }
    await fs.mkdir(path.join(root, "configuration"));
    await fs.writeFile(path.join(root, ".claude", ".ck.json"), JSON.stringify({ portability: { projectConfigPath: "configuration/team.json" } }));
    await fs.writeFile(path.join(root, "configuration", "team.json"), JSON.stringify({ portability: { skillAutoTrigger: false } }));
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const hooks = await (await loadBridge(pluginPath))({ directory: root });

    // Given restricted selection, when an ordinary request enters the real bridge,
    // then its context asks for skill confirmation or direct execution.
    const ordinary = userMessage("review these changes", { sessionID: "main" });
    await hooks["chat.message"]({ sessionID: "main" }, ordinary);
    assert.ok(ordinary.parts.some(part => part.synthetic && /ask ONE skill-choice question before loading or executing it/.test(part.text)));
    const main = { system: [] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "main" }, main);
    assert.ok(main.system.some(text => /generic request.*NOT permission/.test(text)));
    assert.ok(main.system.some(text => /Run the matched skill.*Skip the skill and execute directly/.test(text)));
    assert.ok(main.system.some(text => /Stop and wait for the human answer/.test(text)));
    assert.ok(main.system.some(text => /Confirmation authorizes only the selected skill/.test(text)));
    assert.ok(main.system.some(text => /Do not re-ask the skill-choice question for the same task/.test(text)));
    const commit = userMessage("commit this", { sessionID: "main" });
    await hooks["chat.message"]({ sessionID: "main" }, commit);
    assert.ok(commit.parts.some(part => part.synthetic && /COMMIT-SKILL-ROUTE/.test(part.text)));
    assert.ok(commit.parts.some(part => part.synthetic && /changed content needs current evidence\/receipts, not a transferred Skip/.test(part.text)));

    await hooks.event({ event: { type: "session.created", properties: { info: { id: "child", parentID: "main" } } } });
    const child = { system: ["child base"] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "child" }, child);
    assert.equal(child.system.filter(text => /auto-trigger is DISABLED/.test(text)).length, 1);
    assert.ok(child.system.some(text => /ask ONE skill-choice question/.test(text)));
    assert.ok(child.system.some(text => /preserve the answer and authorized scope/.test(text)));
    // A child without a session.created/chat.message notification also gets live policy.
    const unannounced = { system: [] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "unannounced-child" }, unannounced);
    assert.ok(unannounced.system.some(text => /auto-trigger is DISABLED/.test(text)));

    await fs.writeFile(path.join(root, ".claude", ".ck.local.json"), JSON.stringify({ portability: { skillAutoTrigger: true } }));
    const restored = { system: ["child base"] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "child" }, restored);
    assert.ok(restored.system.some(text => /auto-trigger is enabled/.test(text)));
    assert.ok(!restored.system.some(text => /auto-trigger is DISABLED/.test(text)), "cached startup policy must not override the local reset");
    const next = { system: [] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "child" }, next);
    assert.deepEqual(next.system, [], "default/auto steady state stays silent");
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
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
    const message = userMessage("hello", { sessionID: "s1" });
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

    const message = userMessage("hello", { sessionID: "s1" });
    await hooks["chat.message"]({ sessionID: "s1" }, message);
    assert.deepEqual(message.parts, userMessage("hello", { sessionID: "s1" }).parts);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge gives every injected UserPromptSubmit part the id, sessionID and messageID opencode requires", async () => {
  // Given two UserPromptSubmit hooks that both add context (JSON additionalContext and plain stdout)
  const settings = {
    hooks: {
      UserPromptSubmit: [
        { hooks: [{ type: "command", command: hookCommand("prompt.cjs") }] },
        { hooks: [{ type: "command", command: hookCommand("prompt-plain.cjs") }] },
      ],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });
    const identity = { sessionID: "ses_abc", messageID: "msg_abc", partID: "prt_abc" };

    // When an opencode user message goes through the generated bridge
    const message = userMessage("hello", identity);
    await hooks["chat.message"]({ sessionID: identity.sessionID, messageID: identity.messageID }, message);

    // Then each injected part carries the message's sessionID and messageID, because opencode
    // rejects a user part missing any of id, sessionID or messageID and fails the whole prompt
    const injected = message.parts.filter((part) => part.synthetic === true);
    assert.deepEqual(injected.map((part) => part.text), ["PROMPT_CTX", "PLAIN_PROMPT_CTX"]);
    for (const part of injected) {
      assert.equal(part.sessionID, identity.sessionID, "injected part must carry the message sessionID");
      assert.equal(part.messageID, identity.messageID, "injected part must carry the message messageID");
      assert.equal(part.type, "text");
    }
    // And each part id is the first part's id plus a 2-digit index, unique within the message
    const ids = message.parts.map((part) => part.id);
    assert.equal(new Set(ids).size, ids.length, "part ids must be unique within the message");
    for (const part of injected) {
      assert.match(part.id, /^prt_abc\d{2}$/, "injected part id is the first part id plus a 2-digit index");
    }
    assert.deepEqual(message.parts[0], userMessage("hello", identity).parts[0], "the user's own part is unchanged");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("generated bridge drops UserPromptSubmit context rather than push a part opencode would reject", async () => {
  // Given a UserPromptSubmit hook that adds context
  const settings = {
    hooks: {
      UserPromptSubmit: [{ hooks: [{ type: "command", command: hookCommand("prompt.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    // When the message offers no part id and no messageID to attach the context to
    const message = { parts: [{ type: "text", text: "hello" }] };
    await hooks["chat.message"]({ sessionID: "s1" }, message);

    // Then no part lacking the required keys is pushed, so the prompt is not failed
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

const PROTOCOL_DELIVERY_LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../hooks/lib/protocol-delivery.cjs");

test("[TC-PDL-015] generated bridge reports session.compacted to the protocol-delivery ledger so the next skill load re-delivers", async () => {
  // Given a project whose protocol-delivery lib is the real one, a session that already received a
  // delivery (its record is in the ledger store) and a session that never did
  const root = await createProject();
  try {
    await fs.mkdir(path.join(root, ".claude", "hooks", "lib"), { recursive: true });
    await fs.writeFile(
      path.join(root, ".claude", "hooks", "lib", "protocol-delivery.cjs"),
      `module.exports = require(${JSON.stringify(PROTOCOL_DELIVERY_LIB)});\n`,
      "utf8"
    );
    const store = path.join(root, "tmp", "protocol-delivery");
    await fs.mkdir(path.join(store, "ses_delivered", "main"), { recursive: true });
    await fs.writeFile(path.join(store, "ses_delivered", "main", "review-alpha.json"), JSON.stringify({ hash: "h", deliveredAt: 1, form: "full" }), "utf8");
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    // When opencode compacts both sessions
    const before = Date.now();
    await hooks.event({ event: { type: "session.compacted", properties: { sessionID: "ses_delivered" } } });
    await hooks.event({ event: { type: "session.compacted", properties: { sessionID: "ses_never" } } });
    const after = Date.now();

    // Then the delivered session is stamped as compacted in the ledger store, after its delivery
    const stamp = JSON.parse(await fs.readFile(path.join(store, "ses_delivered", "_session.json"), "utf8"));
    assert.ok(stamp.compactedAt >= before && stamp.compactedAt <= after, `compactedAt ${stamp.compactedAt} outside [${before}, ${after}]`);
    // And a session with nothing delivered gets no store entry
    await assert.rejects(fs.access(path.join(store, "ses_never")), "a session without deliveries must not be written");
    // And the SessionStart hooks still run for the compacted session
    const system = { system: [] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "ses_delivered" }, system);
    assert.deepEqual(system.system, ["SESSION_CTX"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("[TC-PDL-015] generated bridge keeps session.compacted working when the protocol-delivery lib fails", async () => {
  // Given a protocol-delivery lib that throws as soon as it is loaded
  const root = await createProject();
  try {
    await fs.mkdir(path.join(root, ".claude", "hooks", "lib"), { recursive: true });
    await fs.writeFile(path.join(root, ".claude", "hooks", "lib", "protocol-delivery.cjs"), 'throw new Error("broken lib");\n', "utf8");
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    // When opencode compacts a session
    await hooks.event({ event: { type: "session.compacted", properties: { sessionID: "s1" } } });

    // Then the event completes and the SessionStart hooks still run (the report is best effort)
    const system = { system: [] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "s1" }, system);
    assert.deepEqual(system.system, ["SESSION_CTX"]);
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

test("generated plugin exports the opencode V2 definition (id + setup) and keeps the V1 server entrypoint", async () => {
  const root = await createProject();
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    assert.equal(module.default.id, "easy-claude-hooks");
    assert.equal(typeof module.default.setup, "function", "V2 requires a default definition with setup()");
    assert.equal(typeof module.default.server, "function", "V1 reads server() from the default object");
    assert.equal(module.default.server, module.EasyClaudeHooks, "both host generations drive the same bridge");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("[TC-NT-011] V2 setup raises one question alert from form.created and defers the question tool precursor", async () => {
  const settings = {
    hooks: {
      Notification: [{ matcher: "AskUserPrompt|permission_prompt", hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
      PreToolUse: [{ matcher: "AskUserQuestion", hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root);
    const cleanup = await module.default.setup(host.ctx);
    try {
      // When opencode runs its question tool, then publishes the form that waits for the answer
      await host.registrations.tool["execute.before"]({ tool: "question", sessionID: "s-question", input: {} });
      host.emit({ type: "form.created", data: { form: { id: "form_1", sessionID: "s-question", title: "Pick one", fields: [{ key: "q0", title: "Choose a plan", type: "string" }] } } });

      const [precursor, alert] = await recordedPayloadCount(root, 2);
      // Then the tool precursor is deferred and the form event is the one question alert
      assert.equal(precursor.notification_deferred, true);
      assert.equal(alert.hook_event_name, "AskUserPrompt");
      assert.equal(alert.tool_name, "AskUserQuestion");
      assert.equal(alert.session_id, "s-question");
      assert.equal(alert.message, "Choose a plan", "the first form field title is the question the user must answer");
      assert.match(routeThroughRealRouter(precursor, root), /Skipped: deferred question precursor/);
      assert.doesNotMatch(routeThroughRealRouter(alert, root), /Skipped/, "the form event must reach the providers");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("V2 setup ignores events that belong to another project location", async () => {
  const settings = {
    hooks: {
      Notification: [{ matcher: "AskUserPrompt", hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root);
    const cleanup = await module.default.setup(host.ctx);
    try {
      host.emit({ type: "form.created", location: { directory: path.join(root, "..", "other-project") }, data: { form: { sessionID: "other", title: "Other" } } });
      host.emit({ type: "form.created", location: { directory: root }, data: { form: { sessionID: "mine", title: "Mine" } } });
      const [payload] = await recordedPayloadCount(root, 1);
      assert.equal(payload.session_id, "mine");
      assert.equal(await readRecordedPayloads(root).then((rows) => rows.length), 1, "the other project's event starts no hook");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("V2 setup keeps a location-less turn-complete alert in the session's own project", async () => {
  const settings = {
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  const other = path.join(root, "..", "other-project");
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root);
    const cleanup = await module.default.setup(host.ctx);
    try {
      // A turn end names only its session; the session's creation reported where it lives.
      host.emit({ type: "session.created", data: { sessionID: "s-other", location: { directory: other } } });
      host.emit({ type: "session.created", data: { sessionID: "s-own", location: { directory: root } } });
      host.emit({ type: "session.execution.succeeded", data: { sessionID: "s-other" } });
      host.emit({ type: "session.execution.succeeded", data: { sessionID: "s-own" } });

      const [payload] = await recordedPayloadCount(root, 1);
      assert.equal(payload.session_id, "s-own", "only the owning project may raise the turn-complete alert");
      await new Promise((resolve) => setTimeout(resolve, 150));
      assert.equal(await readRecordedPayloads(root).then((rows) => rows.length), 1, "the other project's turn starts no Stop hook");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("V2 setup resolves a location-less turn from the session API when creation was missed", async () => {
  const settings = {
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  const other = path.join(root, "..", "other-project");
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root, {
      "s-other": { id: "s-other", location: { directory: other } },
      "s-own": { id: "s-own", location: { directory: root } },
    });
    const cleanup = await module.default.setup(host.ctx);
    try {
      // The plugin loaded after these sessions existed: only the session API knows where they live.
      host.emit({ type: "session.execution.succeeded", data: { sessionID: "s-other" } });
      host.emit({ type: "session.execution.succeeded", data: { sessionID: "s-own" } });

      const [payload] = await recordedPayloadCount(root, 1);
      assert.equal(payload.session_id, "s-own", "the session's own location decides the alert");
      await new Promise((resolve) => setTimeout(resolve, 150));
      assert.equal(await readRecordedPayloads(root).then((rows) => rows.length), 1, "the other project's turn starts no Stop hook");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("V2 setup fails closed when a location-less turn cannot be attributed to any project", async () => {
  const settings = {
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    // The session row is gone, so neither the event nor the session API names a location.
    const host = createV2Host(root, { "s-unknown": null });
    const cleanup = await module.default.setup(host.ctx);
    try {
      host.emit({ type: "session.execution.succeeded", data: { sessionID: "s-unknown" } });
      await new Promise((resolve) => setTimeout(resolve, 250));
      const rows = await readRecordedPayloads(root).catch(() => []);
      assert.equal(rows.length, 0, "an unprovable owner must raise no turn-complete alert in any project");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("V2 setup raises exactly one turn-complete alert when two project instances share the event stream", async () => {
  const settings = {
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const owner = await createProject(settings);
  const other = await createProject(settings);
  try {
    const ownerPlugin = await materializeOpencodeHooks({ rootDir: owner });
    const otherPlugin = await materializeOpencodeHooks({ rootDir: other });
    const ownerModule = await importPlugin(ownerPlugin.pluginPath);
    const otherModule = await importPlugin(otherPlugin.pluginPath);
    // Both instances see the same server-wide session; only the owner location matches.
    const sessions = { "s-owner": { id: "s-owner", location: { directory: owner } } };
    const ownerHost = createV2Host(owner, sessions);
    const otherHost = createV2Host(other, sessions);
    const ownerCleanup = await ownerModule.default.setup(ownerHost.ctx);
    const otherCleanup = await otherModule.default.setup(otherHost.ctx);
    try {
      ownerHost.emit({ type: "session.execution.succeeded", data: { sessionID: "s-owner" } });
      otherHost.emit({ type: "session.execution.succeeded", data: { sessionID: "s-owner" } });

      const [payload] = await recordedPayloadCount(owner, 1);
      assert.equal(payload.session_id, "s-owner");
      await new Promise((resolve) => setTimeout(resolve, 250));
      assert.equal(await readRecordedPayloads(other).then((rows) => rows.length).catch(() => 0), 0,
        "the non-owning project instance must raise no alert");
    } finally {
      ownerCleanup();
      otherCleanup();
    }
  } finally {
    await fs.rm(owner, { recursive: true, force: true });
    await fs.rm(other, { recursive: true, force: true });
  }
});

test("V2 setup names the project root, not the worktree folder, on an alert", async () => {
  const settings = {
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  const canonical = path.join(root, "..", "OrientOne");
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root, {}, { directory: root, canonical });
    const cleanup = await module.default.setup(host.ctx);
    try {
      host.emit({ type: "session.execution.succeeded", data: { sessionID: "s-worktree" } });

      const [payload] = await recordedPayloadCount(root, 1);
      assert.equal(payload.project_name, path.basename(canonical), "the alert names the project root folder");
      assert.equal(payload.project_root, canonical, "the alert carries the project root path");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("[TC-NT-011] V2 setup forwards permission.asked to the permission_prompt notification hook", async () => {
  const settings = {
    hooks: {
      Notification: [{ matcher: "AskUserPrompt|permission_prompt", hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root);
    const cleanup = await module.default.setup(host.ctx);
    try {
      host.emit({ type: "permission.asked", data: { sessionID: "s-permission", action: "bash", message: "run the deploy?" } });
      const [payload] = await recordedPayloadCount(root, 1);
      assert.equal(payload.hook_event_name, "Notification");
      assert.equal(payload.notification_type, "permission_prompt");
      assert.equal(payload.session_id, "s-permission");
      assert.equal(payload.message, "run the deploy?");
      assert.doesNotMatch(routeThroughRealRouter(payload, root), /Skipped/, "a permission prompt must reach the providers");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("V2 setup forwards a failed tool to PostToolUseFailure and appends its context", async () => {
  const settings = {
    hooks: {
      PostToolUseFailure: [{ hooks: [
        { type: "command", command: hookCommand("record-all.cjs") },
        { type: "command", command: hookCommand("context.cjs") },
      ] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root);
    const cleanup = await module.default.setup(host.ctx);
    try {
      // When opencode reports a failed tool, then the Claude failure hook sees the same payload
      const failed = { content: "command failed" };
      await host.registrations.tool["execute.after"]({
        tool: "bash",
        status: "failed",
        input: { command: "false" },
        error: { message: "exit 1" },
        sessionID: "s-fail",
        result: failed,
      });
      const [payload] = await recordedPayloadCount(root, 1);
      assert.equal(payload.hook_event_name, "PostToolUseFailure");
      assert.equal(payload.tool_name, "Bash");
      assert.equal(payload.error, "exit 1");
      assert.equal(payload.is_interrupt, false);
      assert.equal(payload.session_id, "s-fail");
      assert.match(failed.content, /HELLO_CONTEXT/, "the hook context is appended to the failed result");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("V2 setup maps a child session.created to SubagentStart and delivers its context to the child", async () => {
  const settings = {
    hooks: {
      SessionStart: [{ hooks: [{ type: "command", command: hookCommand("session.cjs") }] }],
      SubagentStart: [{ hooks: [
        { type: "command", command: hookCommand("record-all.cjs") },
        { type: "command", command: hookCommand("context.cjs") },
      ] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root, { ses_child: { id: "ses_child", parentID: "ses_parent", agent: "code-reviewer" } });
    const cleanup = await module.default.setup(host.ctx);
    try {
      // When opencode creates a child session, then the Claude SubagentStart hooks see it
      host.emit({ type: "session.created", data: { sessionID: "ses_child" } });
      const [payload] = await recordedPayloadCount(root, 1);
      assert.equal(payload.hook_event_name, "SubagentStart");
      assert.equal(payload.session_id, "ses_parent");
      assert.equal(payload.agent_id, "ses_child");
      assert.equal(payload.agent_type, "code-reviewer");
      await waitFor(async () => {
        const context = { sessionID: "ses_child", system: [] };
        await host.registrations.session["context"](context);
        const texts = context.system.map((part) => part.text);
        return texts.includes("SESSION_CTX") && texts.includes("HELLO_CONTEXT");
      }, "the child receives both its SessionStart and SubagentStart context");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("V2 setup maps a typed /command to UserPromptExpansion and delivers its context", async () => {
  const settings = {
    hooks: {
      UserPromptExpansion: [{ hooks: [
        { type: "command", command: hookCommand("record-all.cjs") },
        { type: "command", command: hookCommand("context.cjs") },
      ] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root);
    const cleanup = await module.default.setup(host.ctx);
    try {
      // When the developer types a slash command, then the Claude expansion hooks see its name
      await host.registrations.session["prompt"]({ sessionID: "s-prompt", prompt: { text: "/plan --scope=small" } });
      const [payload] = await recordedPayloadCount(root, 1);
      assert.equal(payload.hook_event_name, "UserPromptExpansion");
      assert.equal(payload.command_name, "/plan");
      assert.equal(payload.session_id, "s-prompt");
      await waitFor(async () => {
        const context = { sessionID: "s-prompt", system: [] };
        await host.registrations.session["context"](context);
        return context.system.some((part) => part.text === "HELLO_CONTEXT");
      }, "the prompt receives the expansion context");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("[TC-NT-014] V2 setup maps execution completion to Stop and suppresses the duplicate after an input prompt", async () => {
  const settings = {
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
      Notification: [{ matcher: "AskUserPrompt", hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root, { "s-main": { id: "s-main" } });
    const cleanup = await module.default.setup(host.ctx);
    try {
      // A completed turn alerts once.
      host.emit({ type: "session.execution.succeeded", data: { sessionID: "s-main" } });
      let payloads = await recordedPayloadCount(root, 1);
      assert.equal(payloads[0].hook_event_name, "Stop");
      assert.equal(awaitingCount(payloads, "Stop"), 1);

      // A form pauses the turn and already alerted; the completion event adds no duplicate.
      host.emit({ type: "form.created", data: { form: { id: "form_1", sessionID: "s-main", title: "Answer" } } });
      payloads = await recordedPayloadCount(root, 2);
      host.emit({ type: "session.execution.succeeded", data: { sessionID: "s-main" } });
      await new Promise((resolve) => setTimeout(resolve, 100));
      payloads = await readRecordedPayloads(root);
      assert.equal(awaitingCount(payloads, "Stop"), 1, "the completion event after an input prompt is suppressed");

      // A new execution clears the pending-input state, so its completion alerts again.
      host.emit({ type: "session.execution.started", data: { sessionID: "s-main" } });
      host.emit({ type: "session.execution.succeeded", data: { sessionID: "s-main" } });
      payloads = await recordedPayloadCount(root, 3);
      assert.equal(awaitingCount(payloads, "Stop"), 2);
      assert.doesNotMatch(routeThroughRealRouter(payloads.at(-1), root), /Skipped/);

      // The same finished turn reported again as interrupted alerts once, not twice.
      host.emit({ type: "session.execution.interrupted", data: { sessionID: "s-main" } });
      await new Promise((resolve) => setTimeout(resolve, 100));
      payloads = await readRecordedPayloads(root);
      assert.equal(awaitingCount(payloads, "Stop"), 2, "the same finished turn alerts once");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

function awaitingCount(payloads, eventName) {
  return payloads.filter((payload) => payload.hook_event_name === eventName).length;
}

test("[TC-NT-071] V2 setup forwards SessionEnd with delegated and unknown markers", async () => {
  const settings = {
    hooks: {
      SessionEnd: [{ hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root, {
      "main-session": { id: "main-session" },
      "child-session": { id: "child-session", parentID: "main-session" },
      "unknown-session": null,
    });
    const cleanup = await module.default.setup(host.ctx);
    try {
      host.emit({ type: "session.created", data: { sessionID: "child-session" } });
      host.emit({ type: "session.created", data: { sessionID: "main-session" } });
      host.emit({ type: "session.deleted", data: { sessionID: "child-session" } });
      host.emit({ type: "session.deleted", data: { sessionID: "main-session" } });
      host.emit({ type: "session.deleted", data: { sessionID: "unknown-session" } });

      const [delegated, main, unknown] = await recordedPayloadCount(root, 3);
      assert.equal(delegated.agent_id, "child-session");
      assert.equal(Object.hasOwn(main, "agent_id"), false);
      assert.equal(unknown.conversation_kind, "unknown");
      assert.match(routeThroughRealRouter(delegated, root), /Skipped: subagent SessionEnd/);
      assert.doesNotMatch(routeThroughRealRouter(main, root), /Skipped/);
      assert.match(routeThroughRealRouter(unknown, root), /Skipped: SessionEnd for a conversation of unknown kind/);
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("V2 setup delivers tool context and prompt/session context through the V2 hook surfaces", async () => {
  const settings = {
    hooks: {
      PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: hookCommand("pre-context.cjs") }] }],
      PostToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: hookCommand("context.cjs") }] }],
      SessionStart: [{ matcher: "startup|resume|clear|compact", hooks: [{ type: "command", command: hookCommand("session.cjs") }] }],
      UserPromptSubmit: [{ hooks: [{ type: "command", command: hookCommand("prompt.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root);
    const cleanup = await module.default.setup(host.ctx);
    try {
      const before = { tool: "bash", sessionID: "s-tools", input: { command: "PRE_CONTEXT" } };
      await host.registrations.tool["execute.before"](before);
      const after = { tool: "bash", sessionID: "s-tools", status: "completed", input: { command: "PRE_CONTEXT" }, result: { content: "done" } };
      await host.registrations.tool["execute.after"](after);
      assert.equal(after.result.content, "done\n\nPRE_CONTEXT\n\nHELLO_CONTEXT");

      await host.registrations.session.prompt({ sessionID: "s-prompt", prompt: { text: "hello" } });
      const context = { sessionID: "s-prompt", system: [] };
      await host.registrations.session.context(context);
      assert.deepEqual(context.system.map((part) => part.text), ["SESSION_CTX", "PROMPT_CTX"], "session and prompt context reach the next model request");
      assert.equal(context.system[0].type, "text");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("V2 setup delivers queued pre-tool and failed-tool context through the model context hook", async () => {
  const settings = {
    hooks: {
      PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: hookCommand("pre-context.cjs") }] }],
      PostToolUseFailure: [{ matcher: "*", hooks: [{ type: "command", command: hookCommand("context.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root);
    const cleanup = await module.default.setup(host.ctx);
    try {
      const before = { tool: "bash", sessionID: "s-failed", input: { command: "PRE_CONTEXT" } };
      await host.registrations.tool["execute.before"](before);
      // The failed tool's result carries no text, so its context is queued for the
      // next model request instead of reaching the tool output.
      const after = { tool: "bash", sessionID: "s-failed", status: "error", input: { command: "PRE_CONTEXT" }, error: "fixture failure", result: undefined };
      await host.registrations.tool["execute.after"](after);
      const context = { sessionID: "s-failed", system: [] };
      await host.registrations.session.context(context);
      assert.deepEqual(context.system, [
        { type: "text", text: "PRE_CONTEXT" },
        { type: "text", text: "HELLO_CONTEXT" },
      ], "queued pre-tool and failed-tool context reach the next model request");
      const again = { sessionID: "s-failed", system: [] };
      await host.registrations.session.context(again);
      assert.deepEqual(again.system, [], "delivered pending context is consumed once");
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("V2 setup keeps Claude's PreToolUse block/rewrite and PermissionRequest decision contract", async () => {
  const settings = {
    hooks: {
      PreToolUse: [
        { matcher: "Bash", hooks: [{ type: "command", command: hookCommand("block.cjs") }] },
        { matcher: "Edit|Write", hooks: [{ type: "command", command: hookCommand("rewrite.cjs") }] },
      ],
      PermissionRequest: [{ hooks: [{ type: "command", command: hookCommand("block.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root);
    const cleanup = await module.default.setup(host.ctx);
    try {
      await assert.rejects(
        host.registrations.tool["execute.before"]({ tool: "bash", sessionID: "s1", input: { command: "git commit -m x" } }),
        /blocked: git commit forbidden/
      );
      const edit = { tool: "edit", sessionID: "s1", input: { filePath: "a.ts", oldString: "x", newString: "y" } };
      await host.registrations.tool["execute.before"](edit);
      assert.equal(edit.input.command, "echo safe", "updatedInput is applied in V2's input object");
      assert.equal(edit.input.filePath, "a.ts");

      const permission = { sessionID: "s1", action: "bash", resources: ["git commit -m x"], effect: "ask" };
      await host.registrations.permission.evaluate(permission);
      assert.equal(permission.effect, "deny");
      assert.match(permission.message, /blocked: git commit forbidden/);

      // An already-allowed action is not a permission prompt, so the hook does not run.
      const allowed = { sessionID: "s1", action: "read", resources: ["a.ts"], effect: "allow" };
      await host.registrations.permission.evaluate(allowed);
      assert.equal(allowed.effect, "allow");
      assert.equal(allowed.message, undefined);
    } finally {
      cleanup();
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("V2 setup maps session.compaction.ended to the compact SessionStart hooks", async () => {
  const settings = {
    hooks: {
      SessionStart: [{ matcher: "startup|resume|clear|compact", hooks: [{ type: "command", command: hookCommand("session.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const module = await importPlugin(pluginPath);
    const host = createV2Host(root);
    const cleanup = await module.default.setup(host.ctx);
    try {
      host.emit({ type: "session.compaction.ended", data: { sessionID: "s-compact" } });
      const context = { sessionID: "s-compact", system: [] };
      await waitFor(async () => {
        context.system.length = 0;
        await host.registrations.session.context(context);
        return context.system.length > 0;
      }, "compact SessionStart context");
      assert.deepEqual(context.system.map((part) => part.text), ["SESSION_CTX"]);
    } finally {
      cleanup();
    }
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

test("[TC-NT-014] generated bridge marks a child session going idle so only the main session's turn end alerts", async () => {
  // Given the real generated OpenCode bridge with a Stop hook configured
  const settings = {
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    // When the main session delegates to two child sessions, each child goes idle, then the main one
    await hooks.event({ event: { type: "session.created", properties: { info: { id: "main-session" } } } });
    await hooks.event({ event: { type: "session.created", properties: { info: { id: "child-a", parentID: "main-session" } } } });
    await hooks.event({ event: { type: "session.updated", properties: { info: { id: "child-b", parentID: "main-session" } } } });
    for (const sessionID of ["child-a", "child-b", "main-session"]) {
      await hooks.event({ event: { type: "session.idle", properties: { sessionID } } });
    }

    // Then every idle still reaches the Stop hooks
    const payloads = await readRecordedPayloads(root);
    assert.deepEqual(payloads.map((p) => p.session_id), ["child-a", "child-b", "main-session"]);
    // And only the child idles carry the delegated-conversation marker
    const [childA, childB, main] = payloads;
    assert.equal(childA.agent_id, "child-a");
    assert.equal(childB.agent_id, "child-b");
    assert.equal(Object.hasOwn(main, "agent_id"), false, "the main session idle must not look delegated");

    // And the real notification router alerts once, for the main session only
    assert.match(routeThroughRealRouter(childA, root), /Skipped: subagent Stop/);
    assert.match(routeThroughRealRouter(childB, root), /Skipped: subagent Stop/);
    assert.doesNotMatch(routeThroughRealRouter(main, root), /Skipped/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("[TC-NT-014] generated bridge recognizes a child session announced by a flat session event", async () => {
  // Given the real generated OpenCode bridge with a Stop hook configured
  const settings = {
    hooks: {
      Stop: [{ hooks: [{ type: "command", command: hookCommand("record-all.cjs") }] }],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    // When sessions are announced by the durable event shape, which carries the session fields
    // flat beside the sessionID instead of nesting them under `info`
    await hooks.event({ event: { type: "session.created", properties: { sessionID: "main-session", slug: "main" } } });
    await hooks.event({ event: { type: "session.created", properties: { sessionID: "child-c", parentID: "main-session" } } });
    for (const sessionID of ["child-c", "main-session"]) {
      await hooks.event({ event: { type: "session.idle", properties: { sessionID } } });
    }

    // Then only the child's idle carries the delegated-conversation marker
    const [child, main] = await readRecordedPayloads(root);
    assert.equal(child.session_id, "child-c");
    assert.equal(child.agent_id, "child-c");
    assert.equal(Object.hasOwn(main, "agent_id"), false, "the main session idle must not look delegated");
    // And the real notification router alerts for the main session only
    assert.match(routeThroughRealRouter(child, root), /Skipped: subagent Stop/);
    assert.doesNotMatch(routeThroughRealRouter(main, root), /Skipped/);
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

test("[TC-PDL-068] generated bridge checks a handler's Read condition before it starts the hook", async () => {
  // Given file-read hooks: a probe conditioned on skill files, a hook with no condition, and a
  // probe whose condition has a form the bridge does not evaluate
  const settings = {
    hooks: {
      PostToolUse: [
        {
          matcher: "Read",
          hooks: [
            { type: "command", command: hookCommand("probe.cjs"), if: "Read(**/SKILL.md)" },
            { type: "command", command: hookCommand("record-all.cjs") },
            { type: "command", command: hookCommand("probe-unknown.cjs"), if: "Bash(git *)" },
          ],
        },
      ],
    },
  };
  const root = await createProject(settings);
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    // And the bridge table carries each condition only on the handler that declared it
    assert.deepEqual(buildHooksConfig(settings).hooks.PostToolUse[0].hooks, [
      { type: "command", command: ".claude/hooks/probe.cjs", if: "Read(**/SKILL.md)" },
      { type: "command", command: ".claude/hooks/record-all.cjs" },
      { type: "command", command: ".claude/hooks/probe-unknown.cjs", if: "Bash(git *)" },
    ]);
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });
    const read = (filePath) => hooks["tool.execute.after"]({ tool: "read", sessionID: "s-read", callID: "c", args: { filePath } }, { output: "file text" });

    // When the bridge receives a read of an ordinary source file
    await read("src/app.js");
    // Then the conditioned probe is never started, while the unconditioned hook and the unknown form run
    assert.deepEqual(await readMarkerLines(root, "probe.jsonl"), [], "the probe started for an ordinary file");
    assert.equal((await readRecordedPayloads(root)).length, 1, "the unconditioned hook runs once");
    assert.deepEqual(await readMarkerLines(root, "probe-unknown.jsonl"), ["src/app.js"], "an unknown condition form must never drop a hook");

    // When it receives reads of a skill file, relative and as a drive-letter path with backslashes
    await read(".claude/skills/x/SKILL.md");
    await read("C:\\p\\.claude\\skills\\x\\SKILL.md");
    // Then the probe starts for each
    assert.deepEqual(await readMarkerLines(root, "probe.jsonl"), [".claude/skills/x/SKILL.md", "C:\\p\\.claude\\skills\\x\\SKILL.md"]);
    // And a file that only resembles a skill file does not start it
    await read("docs/SKILL.md.bak");
    await read("notes/my-SKILL.md");
    assert.equal((await readMarkerLines(root, "probe.jsonl")).length, 2, "the probe started for a file that is not a skill file");
    assert.equal((await readRecordedPayloads(root)).length, 5, "the unconditioned hook runs for every read");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

// Invariant: a slower earlier hook still merges first. The configured order, not finish order, decides
// which hook's updatedInput wins (the later one) and the order of the added context.
test("generated bridge merges a slow earlier hook before a fast later one (configured order, not finish order)", async () => {
  const hook = (label, ms) => [
    "process.stdin.resume();",
    "process.stdin.on('end', () => setTimeout(() => {",
    `  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: { command: 'echo ${label}' }, additionalContext: '${label}' } }));`,
    `}, ${ms}));`,
  ].join("\n");
  const root = await createProject({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [
    { type: "command", command: hookCommand("slow-first.cjs") },
    { type: "command", command: hookCommand("fast-second.cjs") },
  ] }] } });
  try {
    await fs.writeFile(path.join(root, ".claude", "hooks", "slow-first.cjs"), `${hook("FIRST", 700)}\n`, "utf8");
    await fs.writeFile(path.join(root, ".claude", "hooks", "fast-second.cjs"), `${hook("SECOND", 20)}\n`, "utf8");
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const hooks = await (await loadBridge(pluginPath))({ directory: root });
    const output = { args: { command: "ls" } };
    await hooks["tool.execute.before"]({ tool: "bash", sessionID: "order", callID: "c1", args: {} }, output);
    assert.equal(output.args.command, "echo SECOND", "the later configured hook's updatedInput wins");
    const system = { system: [] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "order" }, system);
    assert.deepEqual(system.system, ["FIRST", "SECOND"], "contexts merge in configured order");
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

// Invariant: the bridge starts an event's matching hooks together (as Claude Code and Codex do), so their
// wall time is the slowest hook, not the sum, while the merged outcome keeps the configured hook order.
// Proof by rendezvous, not by wall-clock time: each hook marks its start, then waits (bounded) for the other's
// mark. Run together, both meet; run one after another, the first finds no mark and reports "alone".
test("generated bridge runs an event's matching hooks concurrently and merges their outcomes in configured order", async () => {
  const root = await createProject({ hooks: { PreToolUse: [{ matcher: "Bash", hooks: [
    { type: "command", command: hookCommand("slow-first.cjs") },
    { type: "command", command: hookCommand("slow-second.cjs") },
  ] }] } });
  const marks = path.join(root, "marks");
  const rendezvous = (label, other) => [
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    `const marks = ${JSON.stringify(marks)};`,
    `fs.writeFileSync(path.join(marks, ${JSON.stringify(label)}), '');`,
    "const until = Date.now() + 10000;",
    "process.stdin.resume();",
    "process.stdin.on('end', function wait() {",
    `  const met = fs.existsSync(path.join(marks, ${JSON.stringify(other)}));`,
    "  if (!met && Date.now() < until) return void setTimeout(wait, 20);",
    `  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: ${JSON.stringify(label)} + (met ? ' met' : ' alone') } }));`,
    "});",
  ].join("\n");
  try {
    await fs.mkdir(marks);
    await fs.writeFile(path.join(root, ".claude", "hooks", "slow-first.cjs"), `${rendezvous("FIRST", "SECOND")}\n`, "utf8");
    await fs.writeFile(path.join(root, ".claude", "hooks", "slow-second.cjs"), `${rendezvous("SECOND", "FIRST")}\n`, "utf8");
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const hooks = await (await loadBridge(pluginPath))({ directory: root });
    const call = { tool: "bash", sessionID: "parallel", callID: "c1", args: {} };
    await hooks["tool.execute.before"](call, { args: { command: "ls" } });
    const system = { system: [] };
    await hooks["experimental.chat.system.transform"]({ sessionID: "parallel" }, system);
    assert.deepEqual(system.system, ["FIRST met", "SECOND met"], "both hooks ran at once, and outcomes merge in configured order");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
