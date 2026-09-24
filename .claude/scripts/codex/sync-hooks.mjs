#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { resolveMutationProjectRoot, isInvokedAsScript } = require("../lib/project-root.cjs");
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

// NARROW EXCEPTION to `disabledCodexEvents`.
//
// The "static startup context is authoritative" rationale above holds for a
// SessionStart hook that only RESTATES what AGENTS.md / .codex/CODEX_CONTEXT.md
// already carry — mirroring those would duplicate context, which is exactly what
// the skip exists to prevent.
//
// It does NOT hold for a SessionStart hook that PRODUCES a runtime signal which a
// MIRRORED non-SessionStart hook then CONSUMES. Dropping the producer while
// keeping the consumer leaves the consumer registered in .codex/hooks.json,
// looking healthy, tested, and permanently unreachable — a silent, unfalsifiable
// hole. `.scan-stale` was exactly that: `session-init-docs.cjs` is its only
// writer, `init-prompt-gate.cjs` is its only reader, and the reader is mirrored.
//
// Each row names the consumer that forces it. Adding a row asserts that the hook
// computes something no static carrier can hold; a hook that merely reprints
// static context does NOT belong here.
const codexSessionStartMirrors = new Map([
  [
    ".claude/hooks/session-init-docs.cjs",
    "sole writer of the .scan-stale flag, which is the only input to init-prompt-gate's stale-reference-doc branch (UserPromptSubmit — mirrored)",
  ],
  [
    ".claude/hooks/file-convention-inject.cjs",
    "re-arms per-file convention delivery across a compaction boundary; without it the delivery ledger never learns the transcript was condensed and falls back to the blind age path, which fails CLOSED",
  ],
  [
    ".claude/hooks/prompt-ledger.cjs",
    "re-anchors the session goal and prompt list after compact/resume; a static carrier cannot hold per-session prompts",
  ],
  [
    ".claude/hooks/verify-install.cjs",
    "probes and repairs machine-native Git/Git Bash capability and publishes a child/session environment signal that static Codex context cannot represent",
  ],
]);

/** Why this SessionStart hook must mirror despite the event-level skip, or null. */
function sessionStartMirrorReason(rawCommand) {
  if (typeof rawCommand !== "string") return null;
  const normalized = rawCommand.replaceAll("\\", "/");
  for (const [hookPath, reason] of codexSessionStartMirrors) {
    if (normalized.includes(hookPath)) return reason;
  }
  return null;
}

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
// widened matcher (doc-sync-gate,
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

// Events Codex actually dispatches, per the official hook reference
// (https://learn.chatgpt.com/docs/hooks, verified 2026-09-17). An event absent
// here is reported as `unsupported-by-codex`, so a WRONG entry here is not a
// no-op — it silently drops a hook the host would have run. Verify against the
// doc before adding or removing a row.
//
// Deliberately NOT mirrored even though Codex supports them, because this repo
// registers no hook on them: SubagentStart, SubagentStop, PreCompact,
// PostCompact, Interrupt. `Notification` is absent from the Codex reference
// entirely, so its skip is correct.
const supportedEvents = new Set([
  "SessionStart",
  "SessionEnd",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "UserPromptSubmit",
  "Stop",
]);

// Matcher support differs per event on Codex, and the two failure shapes are NOT
// equally bad:
//   - SessionStart accepts startup | resume | clear | compact — the same
//     vocabulary as Claude, so its matchers mirror verbatim.
//   - SessionEnd accepts ONLY `other`. Claude's `clear|exit|compact` names
//     nothing Codex emits, so mirroring it verbatim would register a hook that
//     can NEVER fire. The matcher is therefore dropped and the hook runs on every
//     session end — unscoped, which is why the drop is recorded rather than silent.
//   - UserPromptSubmit and Stop IGNORE matchers outright. Preserving one is
//     behaviourally identical to dropping it today and stays forward-compatible
//     if Codex ever honors them, so they are deliberately left alone. Never read a
//     preserved matcher on those two events as evidence the hook is scoped.
// Only an UNMATCHABLE matcher belongs in this set; an ignored one does not.
const CODEX_MATCHER_UNSUPPORTED = new Set(["SessionEnd"]);

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
  "const gitHelperPath = path.join(root, '.claude', 'hooks', 'lib', 'windows-git.cjs');",
  "try { if (fs.existsSync(gitHelperPath)) { const git = require(gitHelperPath); const result = git.resolveWindowsGit(); if (result && result.outcome === git.OUTCOMES.READY) Object.assign(process.env, git.withGitEnvironment(process.env, result.capability)); } } catch {}",
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
      "Tool matcher capabilities vary by event on Codex. SessionStart shares Claude's startup|resume|clear|compact vocabulary and mirrors verbatim. SessionEnd accepts only `other`, so Claude's clear|exit|compact is DROPPED — kept verbatim it would name nothing Codex emits and the hook could never fire; it mirrors unscoped instead, recorded as a matcher-unsupported-on-codex-hook-runs-unscoped group skip. UserPromptSubmit and Stop ignore matchers entirely, so theirs are preserved unchanged: identical behaviour today, forward-compatible if Codex ever honors them.",
      "Hooks belong in .codex/hooks.json ONLY. Codex loads ALL matching hook sources (~/.codex and <repo>/.codex, hooks.json and config.toml) rather than letting a higher layer replace a lower one, so declaring the same hook in both .codex/config.toml and .codex/hooks.json runs it twice. Repo-level hooks load automatically but only when the project layer is trusted.",
      "SessionStart hooks are omitted from the generated Codex config by default so startup context is not duplicated; both hosts load the same static files, and an adopter may add a local startup hook as an optional accelerator.",
      "EXCEPTION: SessionStart hooks on the codexSessionStartMirrors allowlist ARE mirrored. They produce a runtime signal that a mirrored non-SessionStart hook consumes, so skipping them would leave the consumer registered and permanently unreachable rather than merely un-accelerated. The report's session_start_mirrors array names each one and the consumer that forces it.",
    ],
    session_start_mirrors: [...codexSessionStartMirrors].map(([hook, reason]) => ({
      hook,
      required_by: reason,
    })),
    converted_events: [],
    skipped_events: [],
    converted_groups_total: 0,
    skipped_groups: [],
  };

  for (const [eventName, groups] of Object.entries(claudeHooks)) {
    const disabledReason = disabledCodexEvents.get(eventName);
    // A disabled event still mirrors the hooks on its narrow allowlist — those
    // PRODUCE a signal a mirrored consumer READS. See codexSessionStartMirrors.
    const mirrorOnly =
      disabledReason &&
      eventName === "SessionStart" &&
      Array.isArray(groups) &&
      groups.some(group =>
        (Array.isArray(group?.hooks) ? group.hooks : []).some(hook =>
          sessionStartMirrorReason(hook?.command)
        )
      );
    // No allowlisted producer in this event → the original event-level skip stands
    // verbatim, reason unchanged. The exception adds rows; it never rewrites the rule.
    if (disabledReason && !mirrorOnly) {
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
        if (mirrorOnly && !sessionStartMirrorReason(hook?.command)) continue;
        const command = normalizeCommand(hook?.command);
        if (!command) continue;

        const mappedHook = {
          type: "command",
          command,
        };
        if (typeof hook?.timeout === "number" && Number.isFinite(hook.timeout)) {
          mappedHook.timeout = hook.timeout;
        }
        mappedHooks.push(mappedHook);
      }

      if (mappedHooks.length === 0) {
        pushSkip(
          report,
          eventName,
          i,
          mirrorOnly ? "session-start-not-on-mirror-allowlist" : "no-command-hooks",
          matcher
        );
        continue;
      }

      const mappedGroup = { hooks: mappedHooks };
      if (matcher && matcher !== "*" && !CODEX_MATCHER_UNSUPPORTED.has(eventName)) {
        mappedGroup.matcher = mapMatcherForCodex(matcher);
      } else if (matcher && matcher !== "*") {
        // Recorded, not silently dropped: the hook still mirrors, but UNSCOPED.
        pushSkip(report, eventName, i, "matcher-unsupported-on-codex-hook-runs-unscoped", matcher);
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
const invokedAsScript = isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url));
if (invokedAsScript) {
  await main();
}
