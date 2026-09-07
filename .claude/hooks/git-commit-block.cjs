#!/usr/bin/env node
'use strict';

/**
 * Git authority PreToolUse hook.
 *
 * This hook is a bounded policy adapter, not a shell interpreter. It parses
 * every static Bash statement with the shared tokenizer, normalizes Git global
 * options and effective repository identity, then applies deny-wins policy.
 * Irreversible operations are allowed only when the event session has an
 * exact, unexpired bookkeeping lease for the resolved repository and
 * operation. A lease is not user consent or native host permission.
 */
const fs = require('node:fs');
const path = require('node:path');
const { inspectCommand } = require('./lib/command-inspection.cjs');
const { checkLease } = require('./lib/git-operation-lease.cjs');
const { resolveProjectRoot } = require('./lib/project-root.cjs');
const { runPreToolHookSync } = require('./lib/hook-runner.cjs');
const { reportHookInternalError } = require('./lib/debug-log.cjs');

const PROTECTED_OPERATIONS = new Set(['add', 'commit', 'push']);
const READ_ONLY_OPERATIONS = new Set([
  'status', 'diff', 'log', 'show', 'rev-parse', 'describe',
  'blame', 'check-ignore', 'ls-files', 'shortlog', 'whatchanged'
]);
const GLOBAL_OPTION_ARITY = new Map([
  ['-C', 1], ['--git-dir', 1], ['--work-tree', 1], ['--namespace', 1],
  ['--exec-path', 1], ['--config-env', 1], ['-c', 1], ['--super-prefix', 1],
  ['--attr-source', 1], ['--literal-pathspecs', 0], ['--glob-pathspecs', 0],
  ['--noglob-pathspecs', 0], ['--paginate', 0], ['--no-pager', 0],
  ['--no-replace-objects', 0], ['--bare', 0], ['--version', 0], ['--help', 0]
]);
const CONFIG_READ_FLAGS = new Set(['--get', '--get-all', '--get-regexp', '--get-urlmatch', '--get-color', '--get-colorbool', '--list', '-l']);
const CONFIG_DISPLAY_FLAGS = new Set(['--show-origin', '--show-scope', '--name-only', '--null', '-z',
  '--global', '--system', '--local', '--worktree', '--includes', '--no-includes',
  '--bool', '--int', '--bool-or-int', '--path', '--expiry-date']);
const CONFIG_VALUE_OPTIONS = new Set(['--file', '-f', '--blob', '--type', '--default']);
const STASH_READ_FLAGS = new Set(['list', 'show']);
const MUTATING_GIT = new Set(['fetch', 'reset', 'restore', 'stash', 'config', 'checkout', 'switch', 'clean', 'merge', 'rebase', 'cherry-pick', 'revert', 'rm', 'mv', 'notes', 'update-index', 'worktree', 'submodule']);
const SHELL_WRAPPERS = new Set([
  'bash', 'sh', 'zsh', 'dash', 'ksh', 'fish', 'pwsh', 'powershell', 'cmd',
  'env', 'sudo', 'command', 'builtin', 'exec', 'eval', 'time', 'timeout', 'xargs'
]);
const BRANCH_READ_FLAGS = new Set([
  '-a', '--all', '-r', '--remotes', '-v', '-vv', '--verbose', '--show-current',
  '--contains', '--merged', '--no-merged', '--points-at', '--list', '-l',
  '--format', '--column', '--sort', '--color', '--no-color', '--omit-empty'
]);
const BRANCH_LIST_FLAGS = new Set(['-a', '--all', '-r', '--remotes', '--show-current',
  '--contains', '--merged', '--no-merged', '--points-at', '--list', '-l', '--format']);
const TAG_READ_FLAGS = new Set([
  '-l', '--list', '--contains', '--no-contains', '--merged', '--no-merged',
  '--points-at', '--column', '--sort', '--format', '--color', '--no-color', '-n'
]);
const REMOTE_READ_SUBCOMMANDS = new Set(['show', 'get-url', 'get-branches', 'get-head', 'get-heads']);

function basename(value) {
  return String(value || '').replace(/^.*[\\/]/, '').toLowerCase();
}

function executableName(value) {
  return basename(value).replace(/\.exe$/, '');
}

function canonical(value) {
  if (typeof value !== 'string' || value.length === 0 || !path.isAbsolute(value)) return null;
  try {
    const resolved = fs.realpathSync.native(value);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  } catch (error) {
    if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') {
      reportHookInternalError('git-commit-block', 'canonical path resolution failed', error);
    }
    return null;
  }
}

function absoluteFrom(value, base) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) return null;
  const raw = path.isAbsolute(value) ? value : path.resolve(base, value);
  return canonical(raw);
}

function findRepository(start) {
  let current = canonical(start);
  if (!current) return null;
  while (current) {
    const marker = path.join(current, '.git');
    try {
      if (fs.existsSync(marker)) return canonical(current);
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') {
        reportHookInternalError('git-commit-block', 'repository marker probe failed', error);
      }
      return null;
    }
    const parent = canonical(path.dirname(current));
    if (!parent || parent === current) break;
    current = parent;
  }
  return null;
}

function workTreeGitDirectory(repository) {
  if (!repository) return null;
  const marker = path.join(repository, '.git');
  try {
    const stat = fs.statSync(marker);
    if (stat.isDirectory()) return canonical(marker);
    if (!stat.isFile() || stat.size > 4096) return null;
    const match = /^gitdir: ([^\r\n]+)\r?\n?$/.exec(fs.readFileSync(marker, 'utf8'));
    const directory = match && absoluteFrom(match[1], repository);
    return directory && fs.statSync(directory).isDirectory() ? directory : null;
  } catch (error) {
    if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') {
      reportHookInternalError('git-commit-block', 'Git storage marker probe failed', error);
    }
    return null;
  }
}

function optionParts(value) {
  if (typeof value !== 'string') return { name: '', inline: undefined };
  const index = value.indexOf('=');
  return index < 0 ? { name: value, inline: undefined } : { name: value.slice(0, index), inline: value.slice(index + 1) };
}

/**
 * Resolve the repository for one parsed Git statement. `-C` is folded in
 * order; path-changing options and leading GIT_* assignments are retained.
 * Any dynamic/malformed/foreign target returns `known:false`, so callers can
 * deny protected operations without falling back to the hook project root.
 */
function resolveGitStatement(statement, initialCwd, env = process.env) {
  let cwd = canonical(initialCwd);
  if (!cwd) return { known: false, reason: 'invalid statement cwd', repository: null, operation: null };
  const assignments = new Map(['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR']
    .filter(name => typeof env[name] === 'string').map(name => [name, env[name]]));
  for (const assignment of statement.assignments || []) {
    if (['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR'].includes(assignment.name) && !assignment.static) {
      return { known: false, reason: 'dynamic Git repository assignment', repository: null, operation: null };
    }
    if (!assignment.static || !['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR'].includes(assignment.name)) continue;
    assignments.set(assignment.name, assignment.assignmentValue);
  }
  let gitDir = assignments.get('GIT_DIR');
  let workTree = assignments.get('GIT_WORK_TREE');
  let bare = false;
  let index = 1;
  const argv = statement.argv || [];
  let operation = null;
  let terminator = false;
  for (const token of argv.slice(1)) {
    if (token && token.static === false) {
      return { known: false, reason: 'dynamic Git argument', repository: null, operation: null };
    }
  }
  const resolveOptionValue = (name, inline) => {
    if (inline !== undefined) return inline;
    const next = argv[index++];
    return next && next.static ? next.value : null;
  };
  while (index < argv.length) {
    const token = argv[index++];
    if (!token || !token.static) return { known: false, reason: 'dynamic Git argument', repository: null, operation: null };
    const value = token.value;
    if (terminator) { operation = basename(value); break; }
    if (value === '--') { terminator = true; continue; }
    const { name, inline } = optionParts(value);
    const arity = GLOBAL_OPTION_ARITY.get(name);
    if (arity !== undefined) {
      if (name === '--bare') bare = true;
      if (arity === 1) {
        const argument = resolveOptionValue(name, inline);
        if (typeof argument !== 'string' || argument.length === 0) return { known: false, reason: `missing ${name} value`, repository: null, operation: null };
        if (name === '-C') {
          cwd = absoluteFrom(argument, cwd);
          if (!cwd) return { known: false, reason: 'unresolvable -C target', repository: null, operation: null };
        } else if (name === '--git-dir') gitDir = argument;
        else if (name === '--work-tree') workTree = argument;
      }
      continue;
    }
    if (value.startsWith('-')) {
      // Unknown global options may carry a value. Do not guess its arity:
      // treating the statement as unknown prevents protected fall-through.
      return { known: false, reason: `unsupported Git global option ${value}`, repository: null, operation: null };
    }
    operation = basename(value);
    break;
  }
  if (!operation) return { known: false, reason: 'missing Git operation', repository: null, operation: null };
  // Keep option roles relative to the parsed operation, not a fixed argv offset.
  const operationArgv = [argv[0], argv[index - 1], ...argv.slice(index)];
  if (bare || assignments.has('GIT_COMMON_DIR')) {
    return { known: false, reason: 'bare or explicit Git common directory requires separate scope verification', repository: null, operation, operationArgv };
  }
  const resolvedWorkTree = workTree === undefined ? cwd : absoluteFrom(workTree, cwd);
  if (!resolvedWorkTree) return { known: false, reason: 'unresolvable work tree', repository: null, operation, operationArgv };
  // Git discovers storage from cwd, not --work-tree. A lease's worktree path
  // must identify that same storage, including gitfiles used by linked worktrees.
  const repository = workTree === undefined ? findRepository(cwd) : resolvedWorkTree;
  const workTreeStorage = workTreeGitDirectory(repository);
  const storage = gitDir === undefined ? workTreeGitDirectory(findRepository(cwd)) : absoluteFrom(gitDir, cwd);
  if (!repository || !storage || storage !== workTreeStorage) {
    return { known: false, reason: 'Git storage and worktree identity cannot be matched', repository: null, operation, operationArgv };
  }
  return { known: true, reason: null, repository, operation, cwd: resolvedWorkTree, operationArgv };
}

function addIsDryRun(argv) {
  const valueOptions = new Set(['--pathspec-from-file', '--chmod']);
  const flags = new Set(['--dry-run', '-n', '--verbose', '-v', '--force', '-f',
    '--update', '-u', '--all', '-A', '--no-all', '--ignore-removal', '--intent-to-add', '-N',
    '--refresh', '--ignore-errors', '--ignore-missing', '--renormalize', '--sparse', '--pathspec-file-nul']);
  let dryRun = false;
  for (let index = 2; index < argv.length; index++) {
    const token = argv[index];
    if (!token?.static) return false;
    const value = token.value;
    if (value === '--') break;
    const { name, inline } = optionParts(value);
    if (valueOptions.has(name)) {
      if (inline === undefined && !argv[++index]?.static) return false;
      continue;
    }
    if (!value.startsWith('-') || value === '-') continue;
    // Unknown option arity (including interactive modes) cannot prove a preview.
    if (!flags.has(value)) return false;
    if (value === '--dry-run' || value === '-n') dryRun = true;
  }
  return dryRun;
}

// Git honours any UNAMBIGUOUS abbreviation of a long option, so `--am`, `--ame` and `--amen`
// all amend exactly as `--amend` does (verified against real git; `--a` alone is rejected as
// ambiguous with --allow-empty/--allow-empty-message, so the set stops at two characters).
// Matching only the full spelling let an abbreviated flag fall through to `protected`, where a
// held lease ALLOWS it (see the lease check in evaluate) — rewriting history despite this rule
// being documented as unbypassable. Detection must cover every spelling git itself accepts.
const AMEND_ABBREVIATIONS = new Set(['--am', '--ame', '--amen', '--amend']);
// Options whose value is a SEPARATE operand. An `--amend`-looking token in that position is
// message/author/date text, not a flag, so denying it falsely blocks a legitimate commit under
// a rule that cannot be overridden. Attached (`--message=...`) forms consume no extra operand.
const COMMIT_VALUE_OPTIONS = new Set([
  '--message', '-m', '--file', '-F', '--reuse-message', '-C', '--reedit-message', '-c',
  '--fixup', '--squash', '--author', '--date', '--template', '-t', '--cleanup',
  '--pathspec-from-file', '--trailer'
]);

/**
 * Does this `git commit` argv request an amend, in ANY spelling git accepts?
 * Scans flag positions only: stops at the `--` terminator and steps over separate value
 * operands, mirroring addIsDryRun/configIsReadOnly. Non-static tokens are skipped exactly as
 * before — opaque statements are already routed to `unknown` (and blocked) upstream.
 */
function commitHasAmend(argv) {
  for (let index = 2; index < argv.length; index++) {
    const token = argv[index];
    if (!token?.static) continue;
    const value = token.value;
    if (value === '--') break; // pathspecs follow; they are operands, never the amend flag
    const { name, inline } = optionParts(value);
    if (AMEND_ABBREVIATIONS.has(name)) return true;
    if (COMMIT_VALUE_OPTIONS.has(name) && inline === undefined) index++; // skip its value operand
  }
  return false;
}

function configIsReadOnly(argv) {
  let readAction = false;
  let positional = 0;
  let optionsEnded = false;
  for (let index = 2; index < argv.length; index++) {
    const token = argv[index];
    if (!token?.static) return false;
    const value = token.value;
    if (!optionsEnded && value === '--') { optionsEnded = true; continue; }
    if (optionsEnded || !value.startsWith('-')) {
      // Modern subcommands are actions, not the legacy single-key read form.
      if (positional === 0 && !readAction) {
        if (['edit', 'set', 'unset', 'rename-section', 'remove-section'].includes(value)) return false;
        if (['get', 'list'].includes(value)) { readAction = true; continue; }
      }
      positional++; continue;
    }
    const { name, inline } = optionParts(value);
    if (CONFIG_VALUE_OPTIONS.has(name)) {
      if (inline === undefined && !argv[++index]?.static) return false;
      continue;
    }
    if (CONFIG_READ_FLAGS.has(value)) { readAction = true; continue; }
    if (CONFIG_DISPLAY_FLAGS.has(value)) continue;
    // Unknown and write actions cannot borrow authority from a display/read flag.
    return false;
  }
  return readAction || positional <= 1;
}

function stashIsReadOnly(argv) {
  const args = argv.slice(2).filter(token => token && token.static).map(token => token.value);
  return args.length > 0 && STASH_READ_FLAGS.has(args[0]);
}

function optionIsReadOnly(value, flags) {
  if (flags.has(value)) return true;
  return [...flags].some(flag => value.startsWith(`${flag}=`));
}

function branchIsReadOnly(argv) {
  const args = argv.slice(2).map(token => token.value);
  if (args.length === 0) return true;
  let listMode = false;
  let positional = false;
  for (let index = 0; index < args.length; index++) {
    const value = args[index];
    if (['-d', '-D', '--delete', '-m', '-M', '--move', '-c', '-C', '--copy', '--edit-description'].includes(value)) return false;
    if (optionIsReadOnly(value, BRANCH_READ_FLAGS)) {
      const { name, inline } = optionParts(value);
      if (BRANCH_LIST_FLAGS.has(name)) listMode = true;
      if (name === '--sort' && inline === undefined && args[++index] === undefined) return false;
      continue;
    }
    if (!value.startsWith('-')) {
      positional = true;
      continue;
    }
    return false;
  }
  return listMode || !positional;
}

function tagIsReadOnly(argv) {
  const args = argv.slice(2).map(token => token.value);
  if (args.length === 0) return true;
  let listMode = false;
  for (const value of args) {
    if (['-a', '--annotate', '-s', '--sign', '-u', '--local-user', '-f', '--force', '-d', '--delete'].includes(value)) return false;
    if (optionIsReadOnly(value, TAG_READ_FLAGS)) { listMode = true; continue; }
    if (!value.startsWith('-')) {
      if (!listMode) return false;
      continue;
    }
    return false;
  }
  return true;
}

function remoteIsReadOnly(argv) {
  const args = argv.slice(2).map(token => token.value);
  if (args.length === 0) return true;
  if (args.every(value => ['-v', '--verbose'].includes(value))) return true;
  return REMOTE_READ_SUBCOMMANDS.has(args[0]);
}

function containsGitToken(value) {
  return typeof value === 'string' && /(?:^|[\s'"(])git(?:\.exe)?(?:[\s'";|&)]|$)/i.test(value);
}

function wrappedGitStatement(statement) {
  const command = executableName(statement.command?.value);
  const tokens = statement.tokens || [];
  const hasOpaqueGit = tokens.some(token => token.static === false && containsGitToken(token.value || token.raw));
  const hasNestedGit = SHELL_WRAPPERS.has(command) && tokens.slice(1).some(token => token.static !== false && executableName(token.value) === 'git');
  if (hasOpaqueGit || hasNestedGit) return true;
  return SHELL_WRAPPERS.has(command) && containsGitToken(statement.raw);
}

function classifyStatement(statement, initialCwd) {
  const command = executableName(statement.command?.value);
  if (command !== 'git') {
    if (wrappedGitStatement(statement)) {
      return { kind: 'unknown', operation: 'git', reason: 'unsupported shell wrapper or opaque Git command', resolved: null, statement };
    }
    return { kind: 'none', statement };
  }
  if (statement.status && statement.status !== 'KNOWN') {
    return { kind: 'unknown', operation: 'git', reason: 'unsupported or ambiguous Git syntax', resolved: null, statement };
  }
  const resolved = resolveGitStatement(statement, initialCwd);
  if (!resolved.operation) return { kind: 'unknown', resolved, statement };
  const operation = resolved.operation;
  const argv = resolved.operationArgv || [];
  const hasAmend = operation === 'commit' && commitHasAmend(argv);
  if (hasAmend) return { kind: 'deny', reason: 'git commit --amend is never allowed', operation, resolved, statement };
  if (PROTECTED_OPERATIONS.has(operation)) {
    if (operation === 'add' && addIsDryRun(argv)) {
      return { kind: 'allow', operation, resolved, statement };
    }
    return { kind: 'protected', operation, resolved, statement };
  }
  if (READ_ONLY_OPERATIONS.has(operation)) return { kind: 'allow', operation, resolved, statement };
  if (operation === 'branch' && branchIsReadOnly(argv)) return { kind: 'allow', operation, resolved, statement };
  if (operation === 'tag' && tagIsReadOnly(argv)) return { kind: 'allow', operation, resolved, statement };
  if (operation === 'remote' && remoteIsReadOnly(argv)) return { kind: 'allow', operation, resolved, statement };
  if (operation === 'config' && configIsReadOnly(argv)) return { kind: 'allow', operation, resolved, statement };
  if (operation === 'stash' && stashIsReadOnly(argv)) return { kind: 'allow', operation, resolved, statement };
  if (MUTATING_GIT.has(operation)) return { kind: 'mutating', operation, resolved, statement };
  return { kind: 'unknown', operation, resolved, statement };
}

function projectRoot(input) {
  const cwd = input?.tool_input?.cwd || input?.cwd || process.cwd();
  const resolved = resolveProjectRoot({ cwd, scriptPath: __filename, env: process.env });
  if (resolved.source === 'invalid-env-fallback') {
    throw new Error(`Unable to resolve project root: ${resolved.error}`);
  }
  return canonical(resolved.rootDir) || canonical(cwd);
}

function sessionId(input) {
  const value = input?.session_id || process.env.CK_SESSION_ID;
  return typeof value === 'string' && value.trim() && value !== 'default' ? value : null;
}

function hasLease(input, resolved, operation, root) {
  if (!resolved?.known || !resolved.repository || !root || !sessionId(input)) return false;
  const storeDir = process.env.CK_GIT_LEASE_STORE;
  return checkLease({ projectDir: root, repository: resolved.repository, sessionId: sessionId(input), operation,
    ...(storeDir ? { storeDir } : {}) });
}

function formatBlockMessage(result) {
  if (result.reason?.includes('amend')) {
    return `[BLOCKED] git commit --amend — ${result.reason}\n\nNEVER use --amend. Always create a NEW commit instead.\nThis block cannot be bypassed.`;
  }
  return [
    `[BLOCKED] Git ${result.operation || 'statement'} requires explicit, scoped authority${result.reason ? ` — ${result.reason}` : ''}.`,
    '',
    'The hook accepts only a current session lease for the exact repository and operation.',
    'A project marker, model-authored approval token, or generic phase approval is not authority.',
    'If the user explicitly requested this operation, the commit skill must issue the lease before retrying.',
    'No push or commit is implied by implementation/fix approval.'
  ].join('\n');
}

function evaluationError(message) {
  return {
    code: 2,
    stderr: `[git-commit-block] Unable to evaluate Bash input: ${message}\n`,
    decision: 'error-block'
  };
}

function evaluate(input) {
  // A valid event for another tool is outside this hook's matcher.
  if (!input || input.tool_name !== 'Bash') return undefined;
  if (!input.tool_input || typeof input.tool_input !== 'object' || Array.isArray(input.tool_input)) {
    return evaluationError('tool_input is missing or not an object');
  }
  const command = input.tool_input.command;
  if (typeof command !== 'string' || command.trim().length === 0) {
    return evaluationError('Bash command is missing or not a non-empty string');
  }

  const inspected = inspectCommand(command);
  if (inspected.status !== 'KNOWN' && inspected.statements.length === 0) {
    return evaluationError('command could not be inspected; split it into shorter, explicit commands');
  }
  const cwd = input.tool_input?.cwd || input.cwd || process.cwd();
  let navigationSeen = false;
  const classifications = inspected.statements.map(statement => {
    const commandName = executableName(statement.command?.value);
    // Do not guess which conditional branch ran or emulate the shell directory stack.
    if (['cd', 'pushd', 'popd'].includes(commandName) ||
      (['builtin', 'command', 'eval'].includes(commandName) &&
        (statement.tokens || []).some(token => /(?:^|\s)(?:cd|pushd|popd)(?:\s|$)/.test(token.value || '')))) {
      navigationSeen = true;
    }
    const item = classifyStatement(statement, cwd);
    if (navigationSeen && item.kind === 'protected') {
      return { ...item, kind: 'unknown', reason: 'shell directory state is unknown; retry a separate git -C command', resolved: null };
    }
    return item;
  }).filter(item => item.kind !== 'none');
  if (classifications.length === 0) return undefined;
  const amend = classifications.find(item => item.kind === 'deny');
  if (amend) {
    return {
      code: 2,
      stderr: `${formatBlockMessage({ ...amend, reason: 'Amending commits is never allowed' })}\n`,
      decision: 'block'
    };
  }
  const root = projectRoot(input);
  for (const item of classifications) {
    if (item.kind === 'protected' && hasLease(input, item.resolved, item.operation, root)) continue;
    if (item.kind === 'allow') continue;
    const reason = item.reason || (item.resolved?.known ? null : item.resolved?.reason || 'unsupported or ambiguous Git statement');
    return {
      code: 2,
      stderr: `${formatBlockMessage({ ...item, reason })}\n`,
      decision: 'block'
    };
  }
  return undefined;
}

if (require.main === module) {
  runPreToolHookSync('git-commit-block', evaluate, {
    inputErrorCode: 2,
    errorExitCode: 2
  });
}

module.exports = {
  resolveGitStatement,
  classifyStatement,
  configIsReadOnly,
  stashIsReadOnly,
  branchIsReadOnly,
  tagIsReadOnly,
  remoteIsReadOnly,
  wrappedGitStatement,
  hasLease,
  evaluate
};
