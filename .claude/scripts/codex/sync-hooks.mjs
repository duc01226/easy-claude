#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { resolveMutationProjectRoot } = require("../lib/project-root.cjs");
const rootResolution = resolveMutationProjectRoot({
  cwd: process.cwd(),
  scriptPath: fileURLToPath(import.meta.url),
  env: process.env,
});
const rootDir = rootResolution.rootDir;
export const claudeSettingsPath = path.join(rootDir, ".claude", "settings.json");
export const codexDir = path.join(rootDir, ".codex");
const codexHooksPath = path.join(codexDir, "hooks.json");
const reportPath = path.join(rootDir, "tmp", "hooks.sync.report.json");

const disabledCodexEvents = new Map([
  ["SessionStart", "static-startup-context-authoritative"],
]);

// A matcher is written against the HOST's tool names, so mirroring one verbatim
// silently gates a hook on tools Codex never emits. Codex performs every file
// mutation through `apply_patch` (see `.claude/hooks/lib/file-conventions.cjs`
// `case 'apply_patch'` and `file-convention-inject.cjs` TRIGGER_TOOLS), so a
// matcher naming a Claude MUTATION tool must also name it on the Codex side.
//
// What widening buys is DELIVERY, not coverage. The matcher decides which events
// reach a hook; the hook acts only on tools its own code parses. Exactly one
// registered hook names `apply_patch` — file-convention-inject
// (`.claude/hooks/file-convention-inject.cjs:25`). Every other hook sitting on a
// widened matcher (path-boundary-block, privacy-block, scout-block, doc-sync-gate,
// post-edit-prettier, graph-auto-update) has no `apply_patch` branch and allows or
// ignores the event. So widening is SAFE — no hook fires on work it cannot parse —
// and is NOT a security gain. Never read a widened matcher as proof a gate covers
// Codex writes; see TC-HOOKMIRROR-003 in tests/verify-sync-divergence.test.mjs.
//
// MUTATION TOOLS ONLY — this map must never key a read-only tool. `apply_patch`
// mutates, so aliasing (say) `Read` to it hands write events to a read-gated hook
// and encodes a read/mutate equivalence that no hook honors. `Read` is deliberately
// absent: no configured matcher names a Claude read tool without also naming a
// mutation tool, so the row bought nothing and only carried that risk.
const codexToolAliases = new Map([
  ["Edit", ["apply_patch"]],
  ["Write", ["apply_patch"]],
  ["MultiEdit", ["apply_patch"]],
  ["NotebookEdit", ["apply_patch"]],
]);

export function mapMatcherForCodex(matcher) {
  if (typeof matcher !== "string" || matcher.length === 0) return matcher;
  const tools = matcher.split("|");
  const seen = new Set(tools);
  const added = [];
  for (const tool of tools) {
    for (const alias of codexToolAliases.get(tool) ?? []) {
      if (seen.has(alias)) continue;
      seen.add(alias);
      added.push(alias);
    }
  }
  return added.length === 0 ? matcher : [...tools, ...added].join("|");
}

const supportedEvents = new Set([
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "UserPromptSubmit",
  "Stop",
]);

const nodeHookLauncher = [
  "const fs = require('node:fs');",
  "const path = require('node:path');",
  "const hookPath = process.argv[1];",
  "let root = process.cwd();",
  "for (let candidate = root; ; candidate = path.dirname(candidate)) {",
  "if (fs.existsSync(path.join(candidate, '.claude'))) { root = candidate; break; }",
  "if (path.dirname(candidate) === candidate) break;",
  "}",
  "process.chdir(root);",
  "process.env.CLAUDE_PROJECT_DIR = root;",
  "require(path.join(root, hookPath));",
].join(" ");

function normalizeCommand(command) {
  if (typeof command !== "string" || command.trim().length === 0) {
    return null;
  }

  // Claude uses $CLAUDE_PROJECT_DIR; Codex commands run from the session cwd,
  // which may be a repository subdirectory. Launch Node hooks through a
  // cross-platform resolver: nearest .claude parent in either a worktree or a
  // bare framework copy. This avoids an embedded checkout path and a Git
  // subprocess on every hook invocation.
  const nodeProjectHook = command.match(
    /^\s*node\s+"?\$(?:\{CLAUDE_PROJECT_DIR\}|CLAUDE_PROJECT_DIR)"?((?:[/\\][^\s"']+)+)\s*$/
  );
  if (nodeProjectHook) {
    const hookPath = nodeProjectHook[1].replace(/^[\\/]+/, "").replaceAll("\\", "/");
    return `node -e "${nodeHookLauncher}" -- ${JSON.stringify(hookPath)}`;
  }

  // Preserve the previous cwd-relative behavior for non-Node commands whose
  // project-root variable cannot be safely wrapped without changing semantics.
  let normalized = command
    .replaceAll('"$CLAUDE_PROJECT_DIR"', ".")
    .replaceAll('"${CLAUDE_PROJECT_DIR}"', ".")
    .replaceAll("${CLAUDE_PROJECT_DIR}", ".")
    .replaceAll("$CLAUDE_PROJECT_DIR", ".");

  normalized = normalized
    .replaceAll('"."/', "./")
    .replaceAll('"."\\', ".\\")
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}

function pushSkip(report, eventName, groupIndex, reason, matcher) {
  report.skipped_groups.push({
    event: eventName,
    group_index: groupIndex,
    matcher: matcher ?? null,
    reason,
  });
}

/**
 * Write the Codex hook mirror into `targetDir`; the default sync report is
 * stored under the consuming project's `tmp` directory.
 *
 * Exported so the divergence oracle can materialize a FRESH mirror with THIS
 * function — the same writer the real sync uses — instead of re-deriving what
 * the output "should" look like. A second derivation is a second implementation
 * that drifts from this one, and then the guard passes while the mirror is
 * wrong.
 * @param {string} targetDir - Directory to write hooks.json and, for staging targets, the report into
 * @returns {Promise<object>} The sync report
 */
export async function materializeHookMirror(targetDir = codexDir) {
  return main(targetDir);
}

async function main(targetDir = codexDir) {
  const hooksPath = path.join(targetDir, "hooks.json");
  const hooksReportPath = targetDir === codexDir ? reportPath : path.join(targetDir, "hooks.sync.report.json");
  const rawSettings = await fs.readFile(claudeSettingsPath, "utf8");
  const claudeSettings = JSON.parse(rawSettings);
  const claudeHooks = claudeSettings?.hooks ?? {};

  const codexHooks = {};
  const report = {
    generated_at: new Date().toISOString(),
    source: path.relative(rootDir, claudeSettingsPath).replaceAll("\\", "/"),
    target: path.relative(rootDir, codexHooksPath).replaceAll("\\", "/"),
    notes: [
      "Generated Node hook commands resolve from the nearest .claude parent, so the tracked mirror works in worktrees, session subdirectories, and bare framework copies.",
      "Tool matcher capabilities may vary by Codex runtime; source matchers are preserved when possible.",
      "UserPromptSubmit and Stop now preserve source matcher filters when present.",
      "SessionStart hooks are intentionally omitted from the generated Codex config so startup context is not duplicated; both hosts load the same static files, and an adopter may add a local startup hook as an optional accelerator.",
    ],
    converted_events: [],
    skipped_events: [],
    converted_groups_total: 0,
    skipped_groups: [],
  };

  for (const [eventName, groups] of Object.entries(claudeHooks)) {
    const disabledReason = disabledCodexEvents.get(eventName);
    if (disabledReason) {
      report.skipped_events.push({
        event: eventName,
        reason: disabledReason,
      });
      continue;
    }

    if (!supportedEvents.has(eventName)) {
      report.skipped_events.push({
        event: eventName,
        reason: "unsupported-by-codex",
      });
      continue;
    }

    if (!Array.isArray(groups)) {
      report.skipped_events.push({
        event: eventName,
        reason: "invalid-groups-shape",
      });
      continue;
    }

    const mappedGroups = [];

    for (let i = 0; i < groups.length; i += 1) {
      const group = groups[i] ?? {};
      const matcher = typeof group.matcher === "string" ? group.matcher : undefined;
      const hooks = Array.isArray(group.hooks) ? group.hooks : [];

      const mappedHooks = [];
      for (const hook of hooks) {
        const command = normalizeCommand(hook?.command);
        if (!command) continue;

        mappedHooks.push({
          type: "command",
          command,
        });
      }

      if (mappedHooks.length === 0) {
        pushSkip(report, eventName, i, "no-command-hooks", matcher);
        continue;
      }

      const mappedGroup = { hooks: mappedHooks };
      if (matcher && matcher !== "*") {
        mappedGroup.matcher = mapMatcherForCodex(matcher);
      }
      mappedGroups.push(mappedGroup);
    }

    if (mappedGroups.length > 0) {
      codexHooks[eventName] = mappedGroups;
      report.converted_events.push({
        event: eventName,
        groups: mappedGroups.length,
      });
      report.converted_groups_total += mappedGroups.length;
    } else {
      report.skipped_events.push({
        event: eventName,
        reason: "no-compatible-groups-after-filtering",
      });
    }
  }

  await fs.mkdir(targetDir, { recursive: true });
  await fs.mkdir(path.dirname(hooksReportPath), { recursive: true });
  await fs.writeFile(hooksPath, `${JSON.stringify({ hooks: codexHooks }, null, 2)}\n`, "utf8");
  await fs.writeFile(hooksReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (targetDir === codexDir) {
    console.log(
      `[codex-hooks-sync] wrote ${path.relative(rootDir, codexHooksPath)} with ${report.converted_groups_total} group(s) across ${report.converted_events.length} event(s)`
    );
    console.log(
      `[codex-hooks-sync] skipped ${report.skipped_groups.length} incompatible group(s); report: ${path.relative(rootDir, reportPath)}`
    );
  }
  return report;
}

// Importing this module must not write the real mirror — the divergence oracle
// imports it to materialize into a temp directory.
const invokedAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  await main();
}
