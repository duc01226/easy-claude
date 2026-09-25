#!/usr/bin/env node
'use strict';

/**
 * Review-before-commit PreToolUse gate.
 *
 * Blocks an agent `git commit` when the CURRENT changeset has no review
 * fix-loop receipt. Satisfying receipts are minted by `changes-review
 * --fix-loop`, `why-review --fix-loop`, and `workflow-review-changes
 * --fix-loop` when they converge (see `lib/review-receipt.cjs`). The user can
 * always proceed by explicitly choosing to skip, which mints a `skip` receipt
 * after the agent asks. This is a bounded speedbump, not a security boundary:
 * it exists so an unreviewed commit cannot happen by forgetfulness.
 *
 * Fail closed for commit statements whose target or candidate cannot be
 * resolved safely. CLEAN, CHANGED and ERROR are distinct; only a confirmed
 * CLEAN candidate bypasses a receipt. Unsupported invocation contexts return
 * actionable recovery guidance and never become a clean result.
 *
 * Composes AFTER `doc-sync-gate.cjs`.
 *
 * @hook PreToolUse
 * @matcher Bash
 */
const { inspectCommand } = require('./lib/command-inspection.cjs');
const {
  classifyStatement, findRepository, canonical, AMEND_ABBREVIATIONS
} = require('./lib/git-statement.cjs');
const { runPreToolHookSync, isHookEntryPoint } = require('./lib/hook-runner.cjs');
const { reportHookInternalError } = require('./lib/debug-log.cjs');
const {
  captureReviewTarget,
  matchReviewReceipt,
  matchSkipReceipt
} = require('./lib/review-receipt.cjs');

function statementCwd(input) {
  return input?.tool_input?.cwd || input?.cwd || process.cwd();
}

const UNSUPPORTED_COMMIT_FLAGS = new Set([
  '--include', '-i', '--only', '-o', '--interactive', '--patch', '-p',
  '--pathspec-from-file', '--pathspec-file-nul'
]);
const COMMIT_VALUE_FLAGS = new Set([
  '--message', '-m', '--file', '-F', '--author', '--date', '--cleanup',
  '--template', '-t', '--reuse-message', '-C', '--reedit-message', '-c',
  '--trailer', '--fixup', '--squash'
]);
const SAFE_COMMIT_FLAGS = new Set([
  '--all', '-a', '--allow-empty', '--allow-empty-message', '--no-verify',
  '--verify', '--signoff', '-s', '--quiet', '-q', '--verbose', '-v',
  '--status', '--no-status', '--reset-author', '--no-post-rewrite',
  '--gpg-sign', '-S', '--no-gpg-sign', '--no-edit'
]);
const NO_COMMIT_FLAGS = new Set(['--dry-run', '--help', '-h']);
const SAFE_SHORT_FLAGS = new Set(['-s', '-q', '-v', '-n']);
const CONTEXT_GIT_ASSIGNMENT = /^GIT_(?:INDEX_FILE|DIR|WORK_TREE|COMMON_DIR|CONFIG(?:_|$)|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|REPLACE_REF_BASE|NO_REPLACE_OBJECTS|PREFIX|CEILING_DIRECTORIES|DISCOVERY_ACROSS_FILESYSTEM|NAMESPACE|ATTR_NOSYSTEM|ATTR_SOURCE|SHALLOW_FILE|INDEX_VERSION|LITERAL_PATHSPECS|GLOB_PATHSPECS|NOGLOB_PATHSPECS|ICASE_PATHSPECS)/i;

function tokenValue(token) {
  return typeof token === 'string' ? token : token?.value;
}

function tokenValues(tokens) {
  return (tokens || []).map(tokenValue);
}

// A real invocation is `git [global-option...] commit ...`, so ADJACENCY is the signal: `git`,
// then only option-shaped tokens (each optionally taking one value), then `commit` as the very next
// operand.
//
// The previous pattern asked only whether the words `git` and `commit` BOTH appeared anywhere in
// the text, in either order, at any distance. Every caller of this function sits in a branch that
// has ALREADY failed to parse the statement and fails closed, so that loose match denied ordinary
// read-only work whose text merely mentioned both words:
//   grep -rln "pre-commit-config"         — a filename; `-commit` is not a separate operand
//   grep -iE "git|commit|authority"       — an alternation; `|commit` is not a separate operand
//   a heredoc body citing `git log -S` and the word commit — `log` intervenes, so not adjacent
// Adjacency rejects all three and still matches what the gate exists for: `git commit`,
// `git -c user.name=x commit`, `git -C /repo commit` and `sh -c "git commit -m x"`.
const GIT_COMMIT_ADJACENT_RE =
  /(?:^|[\s'"(;|&])git(?:\.exe)?(?:\s+-{1,2}[A-Za-z][\w-]*(?:=\S+)?(?:\s+(?!-)\S+)?)*\s+commit\b/i;

function isPotentialCommit(command, statements = []) {
  if (GIT_COMMIT_ADJACENT_RE.test(command)) return true;
  return statements.some(statement => {
    const text = tokenValues(statement.argv || statement.tokens).filter(Boolean).join(' ');
    return GIT_COMMIT_ADJACENT_RE.test(text);
  });
}

function unsupportedGlobalContext(statement) {
  for (const assignment of statement.assignments || []) {
    if (CONTEXT_GIT_ASSIGNMENT.test(assignment.name || '')) {
      return `Git context assignment ${assignment.name} is unsupported`;
    }
  }
  const argv = tokenValues(statement.argv);
  if ((argv[0] || '').split(/[\\/]/).pop()?.replace(/\.exe$/i, '').toLowerCase() !== 'git') {
    return 'The Git wrapper did not resolve to a direct supported statement';
  }
  let i = 1;
  while (i < argv.length) {
    const value = argv[i];
    if (value === '-C') {
      if (!argv[i + 1]) return 'Git -C is missing its directory';
      i += 2;
      continue;
    }
    if (value?.startsWith('-C') && value.length > 2) { i++; continue; }
    if (value?.startsWith('-')) return `Git global option ${value} is unsupported for receipt matching`;
    break;
  }
  return null;
}

function parseCommitDescriptor(classification) {
  const resolved = classification.resolved;
  const statement = classification.statement || {};
  const unsupported = unsupportedGlobalContext(statement);
  if (unsupported) return { error: unsupported };
  const argv = tokenValues(resolved?.operationArgv);
  if (argv.length < 2 || argv.some(value => typeof value !== 'string')) return { error: 'Commit argv is unresolved' };
  const args = argv.slice(2);
  let mode = 'staged';
  let sawAll = false;
  let sawAmend = false;
  let literalPaths = [];
  let afterTerminator = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (afterTerminator) { literalPaths.push(arg); continue; }
    if (arg === '--') { afterTerminator = true; continue; }
    if (!arg.startsWith('-')) return { error: `Commit positional argument ${arg} is unsupported; use -- before exact file paths` };
    const flag = arg.includes('=') ? arg.slice(0, arg.indexOf('=')) : arg;
    if (NO_COMMIT_FLAGS.has(flag)) return { noCommit: true };
    // Amend is a commit whose candidate sits over HEAD's parent. Recorded by THIS loop, which knows
    // which tokens are option values (`-am --amend` is a plain commit with message "--amend").
    if (AMEND_ABBREVIATIONS.has(flag)) {
      if (arg !== flag) return { error: `Commit option ${flag} takes no value` };
      sawAmend = true;
      continue;
    }
    if (arg.startsWith('-') && !arg.startsWith('--') && arg.length > 2) {
      const cluster = arg.slice(1);
      for (let position = 0; position < cluster.length; position++) {
        const shortFlag = `-${cluster[position]}`;
        if (shortFlag === '-a') { sawAll = true; continue; }
        if (UNSUPPORTED_COMMIT_FLAGS.has(shortFlag)) return { error: `Commit mode ${shortFlag} is unsupported` };
        if (COMMIT_VALUE_FLAGS.has(shortFlag)) {
          if (position === cluster.length - 1) {
            if (i + 1 >= args.length || args[i + 1] === '--') return { error: `Commit option ${shortFlag} requires a value` };
            i++;
          }
          break;
        }
        if (shortFlag === '-S') break;
        if (SAFE_SHORT_FLAGS.has(shortFlag)) continue;
        return { error: `Unrecognized commit option ${shortFlag} is unsupported for receipt matching` };
      }
      continue;
    }
    if (UNSUPPORTED_COMMIT_FLAGS.has(flag)) return { error: `Commit mode ${flag} is unsupported` };
    if (flag === '-a' || flag === '--all') { sawAll = true; continue; }
    if (COMMIT_VALUE_FLAGS.has(flag)) {
      if (!arg.includes('=')) {
        if (arg.length > 2 && arg.startsWith('-') && !arg.startsWith('--')) {
          // Compact short forms such as -mmessage and -Fmessage consume their suffix.
          if (flag === '-m' || flag === '-F' || flag === '-C' || flag === '-c') continue;
          return { error: `Compact commit option ${arg} is unsupported` };
        }
        if (i + 1 >= args.length || args[i + 1] === '--') return { error: `Commit option ${flag} requires a value` };
        i++;
      }
      continue;
    }
    if (!SAFE_COMMIT_FLAGS.has(flag)) return { error: `Unrecognized commit option ${flag} is unsupported for receipt matching` };
  }
  if (sawAll && literalPaths.length) return { error: 'Combining -a/--all with explicit paths is unsupported' };
  if (literalPaths.length) mode = 'literal-paths';
  else if (sawAll) mode = 'all';
  const descriptor = {
    repository: canonical(resolved.repository),
    cwd: canonical(resolved.cwd),
    mode,
    literalPaths,
    // `git commit --amend` and `git reset --soft HEAD~1 && git commit` produce the same commit,
    // so both are gated the same way: by a receipt over the candidate against HEAD's parent.
    ...(sawAmend ? { amend: true } : {})
  };
  if (!descriptor.repository || !descriptor.cwd) return { error: 'Repository or effective cwd could not be canonicalized' };
  return { descriptor };
}

/** Preserve one descriptor per commit statement; never merge by repository. */
function resolveCommitDescriptors(command, cwd) {
  const inspected = inspectCommand(command);
  if (inspected.status !== 'KNOWN' && inspected.statements.length === 0) {
    return { known: false, reason: 'command could not be inspected' };
  }
  const descriptors = [];
  const statementRepos = new Set();
  for (let index = 0; index < inspected.statements.length; index++) {
    const statement = inspected.statements[index];
    let classification;
    try {
      classification = classifyStatement(statement, cwd);
    } catch (error) {
      reportHookInternalError('review-commit-gate', 'statement classification failed', error);
      if (isPotentialCommit(command, [statement])) return { known: false, reason: 'Git commit statement classification failed' };
      continue;
    }
    if (classification.operation !== 'commit') {
      if (classification.kind === 'unknown' && isPotentialCommit(command, [statement])) {
        return { known: false, reason: classification.reason || 'unresolved Git commit wrapper' };
      }
      if (['cd', 'pushd', 'popd'].includes(String(statement.command?.value || '').toLowerCase()) && isPotentialCommit(command, inspected.statements.slice(index + 1))) {
        return { known: false, reason: 'A working-directory change precedes the commit; use git -C with a literal directory' };
      }
      continue;
    }
    if (!classification.resolved?.known || !classification.resolved.repository || !classification.resolved.cwd) {
      return { known: false, reason: classification.reason || classification.resolved?.reason || 'commit repository context is unresolved' };
    }
    const parsed = parseCommitDescriptor(classification);
    if (parsed.noCommit) continue;
    if (parsed.error) return { known: false, reason: parsed.error };
    const descriptor = parsed.descriptor;
    if (statementRepos.has(descriptor.repository)) {
      return { known: false, reason: 'Multiple sequential commits to one repository require separate reviewed invocations' };
    }
    statementRepos.add(descriptor.repository);
    descriptors.push(descriptor);
  }
  if (inspected.status !== 'KNOWN' && isPotentialCommit(command, inspected.statements)) {
    return { known: false, reason: 'Git commit command contains unsupported or ambiguous shell syntax' };
  }
  return { known: true, descriptors };
}

function blockMessage(repository, snapshot, descriptor, reason) {
  const fingerprint = snapshot?.fingerprint;
  const short = typeof fingerprint === 'string' ? `${fingerprint.slice(0, 12)}…` : 'unavailable';
  const shellQuote = value => `'${String(value).replace(/'/g, "'\\''")}'`;
  const skipRecovery = descriptor
    ? [
      '  4. Skip — only if the user explicitly decides to commit without review; ASK them first (the user alone decides), then mint a descriptor-bound skip:',
      '',
      `  node .claude/hooks/lib/review-receipt.cjs snapshot --target=commit-descriptor --descriptor-json=${shellQuote(JSON.stringify(descriptor))}`,
      '  node .claude/hooks/lib/review-receipt.cjs issue --kind=skip --scope=full-changeset --snapshot-json=\'<exact snapshot JSON returned above>\' --reason="user approved skip"',
      '',
      'Use this exact descriptor for the snapshot and commit. The `skip` shorthand captures only the worktree and may not match this commit candidate.'
    ]
    : [
      'Skip is unavailable because this Git context has no supported exact commit descriptor. Use the `commit` skill to prepare a supported candidate, then choose a review option or explicitly skip that exact candidate.'
    ];
  return [
    '[BLOCKED] Commit refused — the exact commit candidate has no matching review fix-loop receipt.',
    '',
    `Repository: ${repository}`,
    `Candidate fingerprint: ${short}`,
    ...(descriptor ? [`Commit mode: ${descriptor.mode}`, `Effective cwd: ${descriptor.cwd}`] : []),
    // An amend candidate sits over HEAD's parent, so a staged/worktree receipt can never match it.
    ...(descriptor?.amend ? [
      'Amend: candidate measured against HEAD\'s parent. The review fix-loop must snapshot this exact descriptor:',
      `  --target=commit-descriptor --descriptor-json=${shellQuote(JSON.stringify(descriptor))}`
    ] : []),
    ...(snapshot?.errorCode ? [`Candidate status: ERROR (${snapshot.errorCode})`] : []),
    ...(reason ? [`Reason: ${reason}`] : []),
    '',
    'A commit MUST be preceded by a review fix-loop over this exact full candidate.',
    'Ask the user to choose a review option below; recommend ONE by the `commit` skill\'s Review selection rule',
    '(size and risk; heavier on a tie). The chosen fix-loop issues the receipt; then retry the commit:',
    '',
    '  1. /why-review --fix-loop               # use when: docs/config/comments, or a small module, no behaviour change',
    '  2. /changes-review --fix-loop           # use when: a focused behaviour change in one module',
    '  3. /workflow-review-changes --fix-loop  # use when: cross-module/contract, security, data, gates, deps, UI, large diff',
    '',
    'Use the supported default staged, -a/--all, or exact literal -- <files> mode. Unsupported',
    'Git contexts and candidate errors fail closed. Restore the normal repository/default index,',
    'stage the intended content, and review that exact full candidate before retrying.',
    '',
    ...skipRecovery,
    '',
    'Then retry the commit. Committing through the `commit` skill is the supported path.'
  ].join('\n');
}

function evaluate(input, dependencies = {}) {
  if (input?.tool_name !== 'Bash') return undefined;
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || command.length === 0) return undefined;
  // Cheap prefilter: no `commit` token means no commit statement to gate.
  if (!/commit/.test(command)) return undefined;

  const cwd = statementCwd(input);
  const resolved = resolveCommitDescriptors(command, cwd);
  if (!resolved.known) {
    return { code: 2, stderr: `${blockMessage(findRepository(cwd) || cwd, null, null, resolved.reason)}\n`, decision: 'block' };
  }
  if (resolved.descriptors.length === 0) return undefined;

  const capture = dependencies.captureReviewTarget || captureReviewTarget;
  for (const descriptor of resolved.descriptors) {
    const repository = descriptor.repository;
    let snapshot;
    try {
      snapshot = capture({ repository, cwd: descriptor.cwd, target: 'commit-descriptor', descriptor });
    } catch (error) {
      reportHookInternalError('review-commit-gate', 'candidate capture failed', error);
      snapshot = { status: 'ERROR', errorCode: 'CANDIDATE_COMPUTATION_FAILED' };
    }
    if (!snapshot || snapshot.status === 'ERROR') {
      return { code: 2, stderr: `${blockMessage(repository, snapshot, descriptor, snapshot?.errorMessage || 'candidate could not be computed safely')}\n`, decision: 'block' };
    }
    if (snapshot.status === 'CLEAN') continue;

    const receipt = { repository, snapshot };
    if (matchReviewReceipt(receipt)) continue;
    if (matchSkipReceipt(receipt)) continue;

    return {
      code: 2,
      stderr: `${blockMessage(repository, snapshot, descriptor)}\n`,
      decision: 'block'
    };
  }
  return undefined;
}

// Entry-point check covers the Codex `node -e … require(hook)` launcher too (require.main is undefined there).
if (isHookEntryPoint(module)) {
  runPreToolHookSync('review-commit-gate', evaluate, {
    // A malformed input or failed evaluation cannot be treated as permission for commit.
    inputErrorCode: 2,
    errorExitCode: 2
  });
}

module.exports = { evaluate, resolveCommitDescriptors, parseCommitDescriptor, blockMessage };
