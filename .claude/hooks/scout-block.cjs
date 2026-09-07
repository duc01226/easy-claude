#!/usr/bin/env node
'use strict';
/**
 * scout-block.cjs - Cross-platform hook for blocking directory access
 *
 * Blocks access to directories listed in .claude/.ckignore
 * Uses gitignore-spec compliant pattern matching via 'ignore' package
 *
 * Blocking Rules:
 * - File paths: Blocks any file_path/path/pattern containing blocked directories
 * - Bash commands: Blocks directory access (cd, ls, cat, etc.) but ALLOWS build commands
 *   - Blocked: cd node_modules, ls packages/web/node_modules, cat dist/file.js
 *   - Allowed: npm build, go build, cargo build, make, mvn, gradle, docker build, kubectl, terraform
 *
 * Configuration:
 * - Edit .claude/.ckignore to customize blocked patterns (one per line, # for comments)
 * - Supports negation patterns (!) to allow specific paths
 *
 * Exit Codes:
 * - 0: Command allowed
 * - 2: Command blocked
 */

const path = require("path");
const { runPreToolHookSync } = require('./lib/hook-runner.cjs');

// Broad-pattern-detector loaded eagerly (used before build-command check for Glob tool)
const {
  detectBroadPatternIssue,
  formatBroadPatternError,
} = require("./scout-block/broad-pattern-detector.cjs");

// Heavy modules loaded lazily after early-exit checks (pattern-matcher loads vendored 'ignore' package)
let _patternMatcher, _pathExtractor, _errorFormatter;
function getPatternMatcher() {
  return (
    _patternMatcher ||
    (_patternMatcher = require("./scout-block/pattern-matcher.cjs"))
  );
}
function getPathExtractor() {
  return (
    _pathExtractor ||
    (_pathExtractor = require("./scout-block/path-extractor.cjs"))
  );
}
function getErrorFormatter() {
  return (
    _errorFormatter ||
    (_errorFormatter = require("./scout-block/error-formatter.cjs"))
  );
}

// Build command allowlist - these are allowed even if they contain blocked paths
// Handles flags and filters: npm build, pnpm --filter web run build, yarn workspace app build
// Also allows: go, cargo, make, mvn/mvnw, gradle/gradlew, dotnet, docker, bazel, cmake, sbt, flutter, swift, ant, ninja, meson
const BUILD_COMMAND_PATTERN =
  /^(npm|pnpm|yarn|bun)\s+([^\s]+\s+)*(run\s+)?(build|test|lint|dev|start|install|ci|add|remove|update|publish|pack|init|create|exec)/;
const TOOL_COMMAND_PATTERN =
  /^(\.\/)?(npx|pnpx|bunx|tsc|esbuild|vite|webpack|rollup|turbo|nx|jest|vitest|mocha|eslint|prettier|go|cargo|make|mvn|mvnw|gradle|gradlew|dotnet|docker|podman|kubectl|helm|terraform|ansible|bazel|cmake|sbt|flutter|swift|ant|ninja|meson|python|python3|pip|pipx)/;

/**
 * Check if a command is a build/tooling command (should be allowed)
 * Handles compound commands joined by &&, ||, ; by checking each sub-command
 *
 * @param {string} command - The command to check
 * @returns {boolean}
 */
function isBuildCommand(command) {
  if (!command || typeof command !== "string") return false;
  const trimmed = command.trim();

  // Check the full command first (fast path)
  if (
    BUILD_COMMAND_PATTERN.test(trimmed) ||
    TOOL_COMMAND_PATTERN.test(trimmed)
  ) {
    return true;
  }

  // Split compound commands on &&, ||, ; and check each sub-command
  // This handles cases like "cd path && dotnet build" where the build tool
  // is not the first command in the chain
  const subCommands = trimmed.split(/\s*(?:&&|\|\||;)\s*/);
  if (subCommands.length > 1) {
    return subCommands.some((sub) => {
      const s = sub.trim();
      return (
        s && (BUILD_COMMAND_PATTERN.test(s) || TOOL_COMMAND_PATTERN.test(s))
      );
    });
  }

  return false;
}

function evaluate(data) {
  if (!data || typeof data !== 'object') return undefined;
  if (!Object.prototype.hasOwnProperty.call(data, 'tool_input') || !data.tool_input || typeof data.tool_input !== 'object' || Array.isArray(data.tool_input)) {
    return {
      stderr: 'WARN: Invalid PreToolUse structure, allowing operation\n',
      decision: 'input-warning'
    };
  }

  const toolInput = data.tool_input;
  const toolName = data.tool_name || 'unknown';

  // Check for overly broad glob patterns (Glob tool).
  if (toolName === 'Glob' || toolInput.pattern) {
    const broadResult = detectBroadPatternIssue(toolInput);
    if (broadResult.blocked) {
      const errorMsg = formatBroadPatternError(
        broadResult,
        path.dirname(__dirname),
      );
      return { code: 2, stderr: `${errorMsg}\n`, decision: 'block' };
    }
  }

  // Lazy-load heavy modules (pattern-matcher loads vendored 'ignore' package).
  const { loadPatterns, createMatcher, matchPath } = getPatternMatcher();
  const { extractFromToolInput } = getPathExtractor();
  const { formatBlockedError } = getErrorFormatter();

  const scriptDir = __dirname;
  const claudeDir = path.dirname(scriptDir);
  const ckignorePath = path.join(claudeDir, '.ckignore');
  const patterns = loadPatterns(ckignorePath);
  const matcher = createMatcher(patterns);
  const extractedPaths = extractFromToolInput(toolInput, toolName);

  for (const extractedPath of extractedPaths) {
    const result = matchPath(matcher, extractedPath);
    if (result.blocked) {
      const errorMsg = formatBlockedError({
        path: extractedPath,
        pattern: result.pattern,
        tool: toolName,
        claudeDir,
      });
      return { code: 2, stderr: `${errorMsg}\n`, decision: 'block' };
    }
  }

  return undefined;
}

if (require.main === module) {
  runPreToolHookSync('scout-block', evaluate, {
    inputErrorCode: 0,
    errorExitCode: 0
  });
}

module.exports = { isBuildCommand, evaluate };
