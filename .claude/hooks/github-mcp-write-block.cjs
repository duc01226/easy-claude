#!/usr/bin/env node
'use strict';

/**
 * github-mcp-write-block.cjs - Gate GitHub MCP write tools behind a push lease
 *
 * `git-commit-block.cjs` gates the Bash surface: `git push`, and (since the
 * GitHub CLI gate) `gh pr merge`, `gh release create`, mutating `gh api`. The
 * GitHub MCP server is the THIRD path to the same irreversible remote effects
 * and never touches Bash at all — `mcp__github__merge_pull_request` publishes
 * without a shell ever running. A gate that stops two of three paths is not a
 * publish gate; it is a gate on two spellings.
 *
 * This is a SEPARATE hook rather than a branch inside git-commit-block.cjs
 * because that hook's `evaluate()` returns undefined for every non-Bash event
 * by intended contract (asserted by its `non-Bash passthrough` test). Widening
 * it would break that contract for every other caller.
 *
 * Exit codes:
 *   0 = Allow (read tool, or a write covered by a current push lease)
 *   2 = Block (write without scoped authority, or one no local lease can cover)
 */

const fs = require('fs');
const path = require('path');
const { checkLease } = require('./lib/git-operation-lease.cjs');
const { runPreToolHookSync } = require('./lib/hook-runner.cjs');
const { reportHookInternalError } = require('./lib/debug-log.cjs');
const {
  canonical,
  findRepository,
  workTreeGitDirectory,
  projectRoot,
  sessionId
} = require('./git-commit-block.cjs');

const TOOL_PREFIX = 'mcp__github__';

// Modeled as a READ allowlist, so an unmodeled verb is treated as a WRITE and
// denied. That is the opposite of the `gh` gate's fail-open choice, and
// deliberately so: `gh` exposes hundreds of read subcommands whose absence from
// a list would break ordinary work, whereas this namespace is small, its names
// are static (no shell parsing, no dynamic spelling), and every current read is
// a `get_`/`list_`/`search_`. A GitHub MCP tool added later is far more likely
// to be a new write verb than a read that escapes all three prefixes, and the
// cost of guessing wrong is asymmetric: a false block is a lease away, a false
// allow is a published merge.
const READ_PREFIXES = ['get_', 'list_', 'search_'];

/**
 * Whether an MCP tool name is a read-only GitHub query.
 * @param {string} action - Tool name with the mcp__github__ prefix removed
 * @returns {boolean} True when the action only reads
 */
function isReadAction(action) {
  return READ_PREFIXES.some(prefix => action.startsWith(prefix));
}

/**
 * Normalize a Git remote URL to `owner/repo`.
 *
 * Handles the three spellings a GitHub remote actually takes: HTTPS, SCP-style
 * SSH (`git@github.com:o/r.git`), and ssh:// URLs. A remote this cannot parse
 * yields null and therefore never matches — the gate stays closed rather than
 * matching loosely.
 * @param {string} url - Remote URL from .git/config
 * @returns {string|null} Lowercased `owner/repo`, or null
 */
function remoteSlug(url) {
  if (typeof url !== 'string') return null;
  let trimmed = url.trim();
  // An explicit port belongs to the HOST, not the path. Without stripping it,
  // `ssh://git@ssh.github.com:443/acme/widgets.git` parsed the port as the owner
  // and yielded `443/acme/widgets` — a slug that matches no real repository, so
  // a legitimate write to acme/widgets was denied. Only a scheme-qualified URL
  // can carry a port; in SCP form (`git@github.com:owner/repo`) the colon is the
  // path separator and a leading numeric segment there is a real owner.
  if (/^(?:https?|ssh|git):\/\//i.test(trimmed)) {
    trimmed = trimmed.replace(/^((?:https?|ssh|git):\/\/(?:[^@/]+@)?[^/:]+):\d+(?=\/)/i, '$1');
  }
  const match = /^(?:https?:\/\/|ssh:\/\/|git:\/\/)?(?:[^@/]+@)?([^/:]+)[/:]([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(trimmed);
  if (!match) return null;
  const [, host, owner, repo] = match;
  if (!/(^|\.)github\.com$/i.test(host)) return null;
  if (!owner || !repo || owner.includes(':') || repo.includes(':')) return null;
  return `${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

/**
 * Resolve the directory holding a repository's shared `config`.
 *
 * A LINKED WORKTREE's gitdir holds no `config` of its own — remotes live in the
 * common directory it points at through `commondir`. Without following that,
 * every MCP write from inside a worktree would find no remotes and be denied
 * even with a valid lease: a fail-closed answer, but a wrong one.
 * @param {string} repository - Absolute repository work-tree path
 * @returns {string|null} Directory whose `config` names the remotes
 */
function configDirectory(repository) {
  const storage = workTreeGitDirectory(repository);
  if (!storage) return null;
  try {
    const pointer = path.join(storage, 'commondir');
    const stat = fs.statSync(pointer);
    if (!stat.isFile() || stat.size > 4096) return storage;
    const target = fs.readFileSync(pointer, 'utf8').trim();
    if (!target) return storage;
    const resolved = path.isAbsolute(target) ? target : path.resolve(storage, target);
    return fs.statSync(resolved).isDirectory() ? resolved : storage;
  } catch (error) {
    if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') {
      reportHookInternalError('github-mcp-write-block', 'common directory probe failed', error);
    }
    return storage;
  }
}

/**
 * Read every GitHub remote slug configured for a repository.
 * @param {string} repository - Absolute repository work-tree path
 * @returns {Set<string>} Lowercased `owner/repo` slugs
 */
function repositorySlugs(repository) {
  return new Set(remoteSlugsByName(repository).values());
}

/**
 * Read the GitHub remote slugs configured for a repository, keyed by REMOTE NAME.
 *
 * Section-aware on purpose. Matching every `url =` line in `.git/config` also
 * swept up `[submodule ...]` urls and `[url ... insteadOf]` rewrite rules, which
 * are not remotes at all — on a fixture with origin + upstream + one submodule
 * that authorized three repositories where one was intended.
 * @param {string} repository - Absolute repository work-tree path
 * @returns {Map<string, string>} remote name -> lowercased `owner/repo`
 */
function remoteSlugsByName(repository) {
  const storage = configDirectory(repository);
  const remotes = new Map();
  if (!storage) return remotes;
  const configPath = path.join(storage, 'config');
  try {
    const stat = fs.statSync(configPath);
    // A .git/config large enough to matter is not a config this hook should
    // parse; refusing to read it keeps the gate closed instead of slow.
    if (!stat.isFile() || stat.size > 1024 * 1024) return remotes;
    let currentRemote = null;
    for (const line of fs.readFileSync(configPath, 'utf8').split(/\r?\n/)) {
      const section = /^\s*\[([^\]]+)\]\s*$/.exec(line);
      if (section) {
        const remote = /^remote\s+"(.+)"$/.exec(section[1].trim());
        currentRemote = remote ? remote[1] : null;
        continue;
      }
      if (!currentRemote) continue;
      const match = /^\s*url\s*=\s*(.+?)\s*$/.exec(line);
      const slug = match && remoteSlug(match[1]);
      // First url wins; a pushurl or later override does not widen authority.
      if (slug && !remotes.has(currentRemote)) remotes.set(currentRemote, slug);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') {
      reportHookInternalError('github-mcp-write-block', 'remote configuration probe failed', error);
    }
  }
  return remotes;
}

/**
 * The ONE repository a push lease for this checkout authorizes writing to.
 *
 * A push lease records project + session + repository — not a remote — and the
 * push it stands for goes to `origin`. Accepting ANY configured remote therefore
 * granted more than the lease represents: a lease minted for your fork also
 * authorized `merge_pull_request` against the `upstream` you merely track.
 * Falls back to the sole remote when a repository has exactly one under another
 * name; more than one non-origin remote is ambiguous and authorizes nothing.
 * @param {string} repository - Absolute repository work-tree path
 * @returns {string|null} Lowercased `owner/repo`, or null when unresolvable
 */
function leasedSlug(repository) {
  const remotes = remoteSlugsByName(repository);
  if (remotes.has('origin')) return remotes.get('origin');
  return remotes.size === 1 ? [...remotes.values()][0] : null;
}

/**
 * Decide which repository, if any, a write can be leased against.
 * @param {object} toolInput - MCP tool input
 * @param {string} cwd - Event working directory
 * @returns {{known: boolean, reason: string|null, repository: string|null, slug: string|null}}
 */
// Actions that BRING A NEW REPOSITORY INTO EXISTENCE. No lease scoped to a local
// checkout can express that authority, so they are never leaseable regardless of
// what they name.
//
// `fork_repository` belongs here even though its schema DOES require owner/repo:
// those name the repository being forked, while the repository being CREATED is a
// new one under an account (or the uninspected `organization` field) that this
// gate never looks at. It previously rode a push lease for the source repo, and
// the comment here asserted the opposite of the live schema — that it "names no
// existing repository at all" — so the code and its own justification disagreed.
const UNLEASEABLE_ACTIONS = new Set(['create_repository', 'fork_repository']);

/**
 * Decide which repository, if any, a write can be leased against.
 * @param {object} toolInput - MCP tool input
 * @param {string} cwd - Event working directory
 * @param {string} [action] - MCP action name, for the unleaseable-action check
 * @returns {{known: boolean, reason: string|null, repository: string|null, slug: string|null}}
 */
function resolveTarget(toolInput, cwd, action) {
  if (action && UNLEASEABLE_ACTIONS.has(action)) {
    return {
      known: false,
      reason: `${action} creates a NEW repository, which no lease scoped to this checkout can authorize`,
      repository: null,
      slug: null
    };
  }
  const owner = toolInput?.owner;
  const repo = toolInput?.repo;
  if (typeof owner !== 'string' || typeof repo !== 'string' || !owner || !repo) {
    return {
      known: false,
      reason: 'the tool names no owner/repo that a local repository lease can cover',
      repository: null,
      slug: null
    };
  }
  const slug = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const repository = findRepository(canonical(cwd));
  if (!repository) {
    return { known: false, reason: 'GitHub MCP write outside a resolvable repository', repository: null, slug };
  }
  const authorized = leasedSlug(repository);
  if (!authorized) {
    return {
      known: false,
      reason: 'this repository has no `origin` remote (and no single unambiguous remote) to scope a lease to',
      repository: null,
      slug
    };
  }
  if (authorized !== slug) {
    return {
      known: false,
      reason: `the write targets ${slug}, but a push lease for this checkout authorizes only ${authorized}`,
      repository: null,
      slug
    };
  }
  return { known: true, reason: null, repository, slug };
}

function formatBlockMessage(action, resolved) {
  return [
    `[BLOCKED] GitHub MCP ${action} requires explicit, scoped authority${resolved.reason ? ` — ${resolved.reason}` : ''}.`,
    '',
    'Publishing through the GitHub MCP server is the same act as pushing — it',
    'reaches the remote without a shell, so it is gated the same way.',
    'The hook accepts only a current session push lease for the exact repository.',
    'A project marker, model-authored approval token, or generic phase approval is not authority.',
    'If the user explicitly requested this operation, the commit skill must issue the lease before retrying.'
  ].join('\n');
}

function evaluate(input) {
  // A valid event for another tool is outside this hook's matcher.
  if (!input || typeof input.tool_name !== 'string' || !input.tool_name.startsWith(TOOL_PREFIX)) return undefined;
  const action = input.tool_name.slice(TOOL_PREFIX.length);
  if (!action) {
    return { code: 2, stderr: '[github-mcp-write-block] Unable to evaluate MCP input: tool name has no action\n', decision: 'error-block' };
  }
  if (isReadAction(action)) return undefined;

  const toolInput = input.tool_input;
  if (toolInput != null && (typeof toolInput !== 'object' || Array.isArray(toolInput))) {
    return { code: 2, stderr: '[github-mcp-write-block] Unable to evaluate MCP input: tool_input is not an object\n', decision: 'error-block' };
  }

  // Harness cwd FIRST. `tool_input.cwd` is model-authored: preferring it let the
  // caller choose which repository it would be judged against, which is the one
  // input a gate must never take from the party it is gating. Measured as a real
  // BLOCK->ALLOW flip. It remains a last resort only when the harness supplies none.
  const cwd = input.cwd || toolInput?.cwd || process.cwd();
  const resolved = resolveTarget(toolInput, cwd, action);
  const root = projectRoot(input);
  const session = sessionId(input);
  const storeDir = process.env.CK_GIT_LEASE_STORE;
  // GitHub MCP writes consume a push lease — the same authority `git push` and
  // `gh pr merge` consume. Adding a fourth operation term would let a caller
  // hold "MCP authority" while lacking authority to push the same change.
  const leased = resolved.known && root && session && checkLease({
    projectDir: root,
    repository: resolved.repository,
    sessionId: session,
    operation: 'push',
    ...(storeDir ? { storeDir } : {})
  });
  if (leased) return undefined;

  const reason = resolved.reason || (session ? null : 'no session identity to scope a lease to');
  return { code: 2, stderr: `${formatBlockMessage(action, { ...resolved, reason })}\n`, decision: 'block' };
}

if (require.main === module) {
  runPreToolHookSync('github-mcp-write-block', evaluate, {
    inputErrorCode: 2,
    errorExitCode: 2
  });
}

module.exports = {
  evaluate, isReadAction, remoteSlug, configDirectory,
  repositorySlugs, remoteSlugsByName, leasedSlug, resolveTarget, UNLEASEABLE_ACTIONS
};
