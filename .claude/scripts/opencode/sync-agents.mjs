#!/usr/bin/env node

// Mirror the framework's Claude sub-agents into opencode agent definitions.
//
// `.claude/agents/*.md` is the SINGLE source of truth for every host sub-agent mirror. This
// writer renders one `.opencode/agent/<name>.md` per source agent so opencode can dispatch the
// same specialists the workflow protocols name (`spawn_agent(agent_type=...)`), exactly as
// `migrate-claude-to-codex.mjs` renders `.codex/agents/*.toml` for Codex.
//
// The body is copied VERBATIM from the canonical source. Unlike the Codex mirror there is no
// `/skill` -> `$skill` rewrite and no tool-term substitution: opencode already auto-discovers the
// same `.claude/skills`, and the tool names the bodies use (`todowrite`, `question`, `task`)
// already match opencode's. Rewriting them would invent a difference that does not exist.
//
// `model` is deliberately NOT mirrored: the canonical frontmatter carries `model: inherit`, which
// is not a valid opencode model id (opencode expects `provider/model`). Omitting it makes the
// agent inherit the session model, which is what `inherit` means.
//
// PORTABILITY CONTRACT: pure `node:` built-ins + one local `.cjs` require. Copy `.claude` +
// `.opencode` into any repository and this writer still runs with plain `node` — no npm, no
// node_modules, no package.json.
//
// Usage:
//   node .claude/scripts/opencode/sync-agents.mjs           # create/update .opencode/agent/*.md
//   node .claude/scripts/opencode/sync-agents.mjs --check   # verify the mirror is current (read-only)

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../lib/agent-frontmatter.mjs";

const require = createRequire(import.meta.url);
const { resolveMutationProjectRoot } = require("../lib/project-root.cjs");

const rootResolution = resolveMutationProjectRoot({
  cwd: process.cwd(),
  scriptPath: fileURLToPath(import.meta.url),
  env: process.env,
});
const defaultRootDir = rootResolution.rootDir;

export const CLAUDE_AGENTS_RELATIVE = path.join(".claude", "agents");
export const OPENCODE_AGENTS_RELATIVE = path.join(".opencode", "agent");

export function resolveClaudeAgentsDir(rootDir) {
  return path.join(rootDir, CLAUDE_AGENTS_RELATIVE);
}

export function resolveOpencodeAgentsDir(rootDir) {
  return path.join(rootDir, OPENCODE_AGENTS_RELATIVE);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Quote a value as a single-line YAML double-quoted scalar. */
function yamlQuote(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

/**
 * Render one opencode agent document from a canonical Claude agent source.
 *
 * Pure: same input always produces the same bytes, which is what makes the
 * `--check` byte-comparison meaningful and re-runs idempotent.
 *
 * @param {string} fileName canonical file name, e.g. `architect.md`
 * @param {string} sourceText canonical file contents
 * @returns {string}
 */
export function renderAgentDocument(fileName, sourceText) {
  const { frontmatter, body } = parseFrontmatter(sourceText);
  const description =
    String(frontmatter.description || `Migrated from .claude/agents/${fileName}`)
      .replace(/\s+/g, " ")
      .trim() || `Migrated from .claude/agents/${fileName}`;

  return [
    "---",
    `description: ${yamlQuote(description)}`,
    "mode: subagent",
    "---",
    "",
    `<!-- GENERATED MIRROR of .claude/agents/${fileName} — do not hand-edit; edit the canonical`,
    "     source and re-run: node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs -->",
    "",
    `Source: .claude/agents/${fileName}`,
    "",
    body,
    "",
  ].join("\n");
}

/** List the canonical agent file names, sorted, `.md` only. */
async function listSourceAgents(claudeAgentsDir) {
  let entries;
  try {
    entries = await fs.readdir(claudeAgentsDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function resolvePaths(options = {}) {
  const rootDir = options.rootDir ?? defaultRootDir;
  return {
    rootDir,
    claudeAgentsDir: options.claudeAgentsDir ?? resolveClaudeAgentsDir(rootDir),
    agentsDir: options.agentsDir ?? resolveOpencodeAgentsDir(rootDir),
  };
}

/**
 * Write the opencode agent mirror from the canonical Claude agents.
 *
 * @param {object} [options]
 * @param {string} [options.rootDir] project root (defaults to the resolved mutation root)
 * @param {string} [options.claudeAgentsDir] override for `.claude/agents`
 * @param {string} [options.agentsDir] override for `.opencode/agent`
 * @returns {Promise<{agentsDir: string, count: number, written: string[], unchanged: string[]}>}
 */
export async function materializeOpencodeAgents(options = {}) {
  const { claudeAgentsDir, agentsDir } = resolvePaths(options);
  const fileNames = await listSourceAgents(claudeAgentsDir);
  if (fileNames.length === 0) {
    throw new Error(`no canonical agents found in ${claudeAgentsDir}`);
  }

  await fs.mkdir(agentsDir, { recursive: true });

  const written = [];
  const unchanged = [];
  for (const fileName of fileNames) {
    const sourceText = await fs.readFile(path.join(claudeAgentsDir, fileName), "utf8");
    const serialized = renderAgentDocument(fileName, sourceText);
    const outputPath = path.join(agentsDir, fileName);

    const current = (await pathExists(outputPath)) ? await fs.readFile(outputPath, "utf8") : null;
    if (current === serialized) {
      unchanged.push(fileName);
      continue;
    }
    await fs.writeFile(outputPath, serialized, "utf8");
    written.push(fileName);
  }

  return { agentsDir, count: fileNames.length, written, unchanged };
}

/**
 * Verify the opencode agent mirror matches a fresh render of the canonical agents. Read-only.
 *
 * Fails on a missing or stale mirror file. Orphan `.md` files in the generated directory (no
 * canonical counterpart) are REPORTED but do not fail the check: this writer never deletes, and a
 * stray hand-written agent should be surfaced rather than silently destroyed.
 *
 * @param {object} [options] same as `materializeOpencodeAgents`
 * @returns {Promise<{ok: boolean, agentsDir: string, reason: string|null, orphans: string[]}>}
 */
export async function checkOpencodeAgents(options = {}) {
  const { claudeAgentsDir, agentsDir } = resolvePaths(options);
  const fileNames = await listSourceAgents(claudeAgentsDir);
  if (fileNames.length === 0) {
    return { ok: false, agentsDir, reason: `no canonical agents found in ${claudeAgentsDir}`, orphans: [] };
  }

  const expected = new Set(fileNames);
  for (const fileName of fileNames) {
    const outputPath = path.join(agentsDir, fileName);
    if (!(await pathExists(outputPath))) {
      return { ok: false, agentsDir, reason: `missing generated agent ${fileName}`, orphans: [] };
    }
    const sourceText = await fs.readFile(path.join(claudeAgentsDir, fileName), "utf8");
    const expectedText = renderAgentDocument(fileName, sourceText);
    const actualText = await fs.readFile(outputPath, "utf8");
    if (actualText !== expectedText) {
      return { ok: false, agentsDir, reason: `stale generated agent ${fileName}`, orphans: [] };
    }
  }

  const orphans = (await fs.readdir(agentsDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md") && !expected.has(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return { ok: true, agentsDir, reason: null, orphans };
}

function parseArgs(args) {
  return { check: args.includes("--check") };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const agentsRel = path.relative(defaultRootDir, resolveOpencodeAgentsDir(defaultRootDir));

  if (args.check) {
    const result = await checkOpencodeAgents();
    if (!result.ok) {
      console.error(`[opencode-agents-sync] ${result.reason}`);
      console.error("[opencode-agents-sync] run: node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs");
      process.exitCode = 1;
      return;
    }
    for (const orphan of result.orphans) {
      console.warn(`[opencode-agents-sync] warning: ${path.join(agentsRel, orphan)} has no canonical .claude/agents counterpart`);
    }
    console.log(`[opencode-agents-sync] ${agentsRel} is current`);
    return;
  }

  const result = await materializeOpencodeAgents();
  if (result.written.length === 0) {
    console.log(`[opencode-agents-sync] ${agentsRel} already matches ${result.count} canonical agent(s)`);
  } else {
    console.log(`[opencode-agents-sync] wrote ${result.written.length} of ${result.count} agent(s) into ${agentsRel}`);
  }
}

const invokedAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  await main();
}
