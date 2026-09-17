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

// The whole-command build allowlist that used to live here (BUILD_COMMAND_PATTERN,
// TOOL_COMMAND_PATTERN, isBuildCommand) was REMOVED on 2026-09-17. It was dead:
// `evaluate` never called it, and the live exemption is token-level —
// `scout-block/path-extractor.cjs` `isBuildOperationToken`, which classifies a
// build operation per compound segment instead of anchoring a regex at the start
// of the whole command. It was not harmless dead code: both test files carried
// their own inline COPIES of it and asserted against those, so 90 cases reported
// green while exercising nothing that ships. They now drive `evaluate` directly,
// and doing so immediately surfaced a live crash on `go build ./...`
// (pattern-matcher.cjs matchPath).

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

module.exports = { evaluate };
