import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

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
};

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

test("generated bridge forwards Notification events to the notify hook", async () => {
  const root = await createProject();
  try {
    const { pluginPath } = await materializeOpencodeHooks({ rootDir: root });
    const factory = await loadBridge(pluginPath);
    const hooks = await factory({ directory: root });

    await hooks.event({ event: { type: "question.asked", properties: { sessionID: "s1" } } });
    const payload = JSON.parse(await fs.readFile(path.join(root, "tmp", "hook-payload.json"), "utf8"));
    assert.equal(payload.hook_event_name, "AskUserPrompt");
    assert.equal(payload.tool_name, "AskUserQuestion");
    assert.equal(payload.session_id, "s1");
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
