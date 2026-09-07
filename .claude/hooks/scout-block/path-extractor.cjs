#!/usr/bin/env node
/**
 * path-extractor.cjs - Extract paths from Claude Code tool inputs
 *
 * Extracts file_path, path, pattern params and parses Bash commands
 * to find all path-like arguments.
 */
const { inspectCommand } = require('../lib/command-inspection.cjs');

/**
 * Extract all paths from a tool_input object
 * Handles: file_path, path, pattern params and command strings
 *
 * @param {Object} toolInput - The tool_input from hook JSON
 * @param {string} [toolName] - The tool name (e.g., 'Grep', 'Glob', 'Read')
 * @returns {string[]} Array of extracted paths
 */
function extractFromToolInput(toolInput, toolName) {
  const paths = [];

  if (!toolInput || typeof toolInput !== "object") {
    return paths;
  }

  // Grep 'pattern' is a search regex (e.g., 'build'), NOT a file path — skip it.
  // Glob 'pattern' IS a file path pattern (e.g., '**/node_modules/**') — keep checking it.
  const directParams =
    toolName === "Grep"
      ? ["file_path", "path"]
      : ["file_path", "path", "pattern"];
  for (const param of directParams) {
    if (toolInput[param] && typeof toolInput[param] === "string") {
      const normalized = normalizeExtractedPath(toolInput[param]);
      if (normalized) paths.push(normalized);
    }
  }

  // Extract from Bash command if present
  if (toolInput.command && typeof toolInput.command === "string") {
    const cmdPaths = extractFromCommand(toolInput.command);
    paths.push(...cmdPaths);
  }

  return paths.filter(Boolean);
}

/**
 * Extract path-like segments from a Bash command string
 * Handles quoted paths and filters out non-path tokens
 *
 * @param {string} command - The command string
 * @returns {string[]} Array of extracted paths
 */
function extractFromCommand(command) {
  if (!command || typeof command !== "string") {
    return [];
  }

  const paths = [];

  // Keep quoted words in their argument position. Separate quote scanning
  // loses whether "build" is npm's operation or a later filesystem operand.
  const inspected = inspectCommand(command);
  const tokens = inspected.diagnostics.some(item => item.code === 'INPUT_LIMIT')
    ? (command.match(/"[^"]*"|'[^']*'|[^\s]+/g) || []).map(normalizeExtractedPath)
    : inspected.statements.flatMap(statement => [
    ...statement.tokens.map(token => token.static ? token.value : token.raw),
    ...(statement.separator ? [statement.separator.value] : [])
  ]);

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    // Skip flags and shell operators
    if (isSkippableToken(token)) continue;

    // A build/test/lint word is an operation when it follows a recognized
    // build tool or an explicit package-manager verb. It is not a filesystem
    // operand in that position. Do not use this as a command-wide bypass:
    // paths in the same command and every later compound segment are still
    // extracted and matched against .ckignore.
    if (isBuildOperationToken(tokens, index)) continue;

    // Priority check: if token IS a blocked directory name exactly, include it
    // This handles cases like "cd build" where "build" is both a command word
    // and a blocked directory name
    if (isBlockedDirName(token)) {
      paths.push(normalizeExtractedPath(token));
      continue;
    }

    // Skip common non-path command words
    if (isCommandKeyword(token)) continue;

    // Check if it looks like a path
    if (looksLikePath(token)) {
      paths.push(normalizeExtractedPath(token));
    }
  }

  return paths;
}

const BUILD_TOOLS = new Set([
  'npm', 'pnpm', 'yarn', 'bun', 'npx', 'pnpx', 'bunx', 'tsc', 'esbuild', 'vite',
  'webpack', 'rollup', 'turbo', 'nx', 'jest', 'vitest', 'mocha', 'eslint',
  'prettier', 'go', 'cargo', 'make', 'mvn', 'mvnw', 'gradle', 'gradlew', 'dotnet',
  'docker', 'podman', 'kubectl', 'helm', 'terraform', 'ansible', 'bazel', 'cmake',
  'sbt', 'flutter', 'swift', 'ant', 'ninja', 'meson', 'python', 'python3', 'pip', 'pipx'
]);
const BUILD_OPERATIONS = new Set(['build', 'test', 'lint', 'dev', 'start', 'install', 'ci', 'exec', 'run']);

function isBuildOperationToken(tokens, index) {
  const token = String(tokens[index] || '').toLowerCase();
  if (!BUILD_OPERATIONS.has(token)) return false;
  let segmentStart = index;
  // Match the scanner's supported separators, including a physical newline.
  while (segmentStart > 0 && !['&&', '||', ';', '|', '\n'].includes(tokens[segmentStart - 1])) segmentStart--;
  const segment = tokens.slice(segmentStart, index + 1).filter(value => !isSkippableToken(value));
  const executable = String(segment[0] || '').replace(/^.*[\\/]/, '').toLowerCase().replace(/\.exe$/, '');
  if (segment.length === 0 || !BUILD_TOOLS.has(executable)) return false;
  const previous = String(tokens[index - 1] || '').toLowerCase();
  if (previous === 'run' || previous === 'exec' || previous === 'workspace') return true;
  // Tool invocations may place a script/project path between the tool and
  // its operation (for example `python .claude/scripts/code_graph build`).
  // Treat the operation token as a command word, while still extracting every
  // other operand in the segment so a blocked path cannot hide behind the
  // build exemption (for example `dotnet build node_modules/app.csproj`).
  return segment.length >= 2 && BUILD_TOOLS.has(executable);
}

// Common blocked directory names that should be extracted even if they
// match command keywords (e.g., "build" is both a subcommand and a dir name)
// Keep in sync with DEFAULT_PATTERNS in pattern-matcher.cjs
const BLOCKED_DIR_NAMES = [
  "node_modules",
  "__pycache__",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".venv",
  "venv",
  "vendor",
  "target",
  "coverage",
];

/**
 * Check if token is exactly a blocked directory name
 * This takes priority over command keyword filtering
 *
 * @param {string} token - Token to check
 * @returns {boolean}
 */
function isBlockedDirName(token) {
  return BLOCKED_DIR_NAMES.includes(token);
}

/**
 * Check if a string looks like a file path
 *
 * @param {string} str - String to check
 * @returns {boolean}
 */
function looksLikePath(str) {
  if (!str || str.length < 2) return false;

  // Contains path separator
  if (str.includes("/") || str.includes("\\")) return true;

  // Starts with relative path indicator
  if (str.startsWith("./") || str.startsWith("../")) return true;

  // Has file extension (likely a file)
  if (/\.\w{1,6}$/.test(str)) return true;

  // Contains common blocked directory names
  if (/node_modules|__pycache__|\.git|dist|build/.test(str)) return true;

  // Looks like a directory path
  if (/^[a-zA-Z0-9_-]+\//.test(str)) return true;

  return false;
}

/**
 * Check if token should be skipped (flags, operators)
 *
 * @param {string} token - Token to check
 * @returns {boolean}
 */
function isSkippableToken(token) {
  // Flags
  if (token.startsWith("-")) return true;

  // Shell operators
  if (["|", "||", "&&", ">", ">>", "<", "<<", "&", ";"].includes(token))
    return true;
  if (token.startsWith("|") || token.startsWith(">") || token.startsWith("<"))
    return true;
  if (token.startsWith("&")) return true;

  // Numeric values
  if (/^\d+$/.test(token)) return true;

  return false;
}

/**
 * Check if token is a common command keyword (not a path)
 *
 * @param {string} token - Token to check
 * @returns {boolean}
 */
function isCommandKeyword(token) {
  const keywords = [
    // Shell commands
    "echo",
    "cat",
    "ls",
    "cd",
    "rm",
    "cp",
    "mv",
    "find",
    "grep",
    "head",
    "tail",
    "wc",
    "du",
    "tree",
    "touch",
    "mkdir",
    "rmdir",
    "pwd",
    "which",
    "env",
    "export",
    "source",
    "bash",
    "sh",
    "zsh",
    "true",
    "false",
    "test",
    "xargs",
    "tee",
    "sort",
    "uniq",
    "cut",
    "tr",
    "sed",
    "awk",
    "diff",
    "chmod",
    "chown",
    "ln",
    "file",

    // Package managers and their subcommands
    "npm",
    "pnpm",
    "yarn",
    "bun",
    "npx",
    "pnpx",
    "bunx",
    "node",
    "run",
    "build",
    "test",
    "lint",
    "dev",
    "start",
    "install",
    "ci",
    "exec",
    "add",
    "remove",
    "update",
    "publish",
    "pack",
    "init",
    "create",

    // Build tools
    "tsc",
    "esbuild",
    "vite",
    "webpack",
    "rollup",
    "turbo",
    "nx",
    "jest",
    "vitest",
    "mocha",
    "eslint",
    "prettier",

    // Git
    "git",
    "commit",
    "push",
    "pull",
    "merge",
    "rebase",
    "checkout",
    "branch",
    "status",
    "log",
    "diff",
    "add",
    "reset",
    "stash",
    "fetch",
    "clone",

    // Docker
    "docker",
    "compose",
    "up",
    "down",
    "ps",
    "logs",
    "exec",
    "container",
    "image",

    // Misc
    "sudo",
    "time",
    "timeout",
    "watch",
    "make",
    "cargo",
    "python",
    "python3",
    "pip",
    "ruby",
    "gem",
    "go",
    "rust",
    "java",
    "javac",
    "mvn",
    "gradle",
  ];

  return keywords.includes(token.toLowerCase());
}

/**
 * Normalize an extracted path
 * - Remove surrounding quotes
 * - Normalize path separators to forward slash
 *
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
function normalizeExtractedPath(path) {
  if (!path) return "";

  let normalized = path.trim();

  // Remove surrounding quotes
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }

  // Normalize path separators to forward slash
  normalized = normalized.replace(/\\/g, "/");

  // Remove trailing slash for consistency
  if (normalized.endsWith("/") && normalized.length > 1) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

module.exports = {
  extractFromToolInput,
  extractFromCommand,
  looksLikePath,
  isSkippableToken,
  isCommandKeyword,
  isBlockedDirName,
  normalizeExtractedPath,
  BLOCKED_DIR_NAMES,
};
