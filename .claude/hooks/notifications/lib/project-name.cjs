/**
 * Project identity shared by every notification provider.
 *
 * A session may run inside a git worktree or another subdirectory. The alert
 * must still name the project root the developer opened, not the moving cwd.
 * Hosts that know the root pass `project_name` / `project_root`; older hosts and
 * Claude Code/Codex fall back to the session cwd, then CLAUDE_PROJECT_DIR.
 */
'use strict';

/**
 * Last non-empty path segment, splitting on both separators (portable).
 * @param {string} value - Path-like value
 * @returns {string} Folder name or ''
 */
function basenameOf(value) {
  if (typeof value !== 'string' || !value) return '';
  const parts = value.split(/[\\/]+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

/**
 * Resolve the project display name.
 * @param {Object} input - Hook input with optional project_name/project_root
 * @param {Object} [env] - Process environment
 * @returns {string} Project folder name or ''
 */
function projectNameOf(input, env = process.env) {
  const source = input && typeof input === 'object' ? input : {};
  if (typeof source.project_name === 'string' && source.project_name.trim()) {
    return source.project_name.trim();
  }
  const root = basenameOf(source.project_root);
  if (root) return root;
  const fromEnv = basenameOf(env && env.CLAUDE_PROJECT_DIR);
  if (fromEnv) return fromEnv;
  return basenameOf(source.cwd);
}

/**
 * Resolve the project root path for display when the host provides one.
 * @param {Object} input - Hook input with optional project_root
 * @returns {string} Root path or ''
 */
function projectRootOf(input) {
  const source = input && typeof input === 'object' ? input : {};
  return typeof source.project_root === 'string' && source.project_root ? source.project_root : '';
}

module.exports = { basenameOf, projectNameOf, projectRootOf };
