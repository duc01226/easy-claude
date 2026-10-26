#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Review-before-commit PreToolUse gate.
 *
 * Blocks an agent `git commit` when the CURRENT changeset has no review
 * fix-loop receipt. Satisfying receipts are minted by `commit-review --fix-loop`, `changes-review
 * --fix-loop`, `why-review --fix-loop`, and `workflow-review-changes
 * --fix-loop` when they converge (see `lib/review-receipt.cjs`). A `skip`
 * receipt also clears it: the `commit` skill mints one for a Low-risk candidate
 * or on the user's explicit request. This is a bounded speedbump, not a security boundary:
 * it exists so an unreviewed commit cannot happen by forgetfulness.
 *
 * Fail closed for commit statements whose target or candidate cannot be
 * resolved safely. CLEAN, CHANGED and ERROR are distinct; only a confirmed
 * CLEAN candidate bypasses a receipt. Unsupported invocation contexts return
 * actionable recovery guidance and never become a clean result.
 *
 * Under `reviewGate.mode: enforce` (project config, off by default) it also gates `gh pr create` and
 * `gh pr ready`: the branch's committed head needs a whole-branch receipt (review or recorded skip)
 * against the merge-base with the pull request's base. See `lib/review-receipt.cjs` for the branch
 * target and for attested review receipts.
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
  matchSkipReceipt,
  reviewGateMode,
  currentBranch,
  hasAnyReceipt
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
  /(?:^|[\s'"(;|&])git(?:\.exe)?(?:\s+-{1,2}[A-Za-z][\w-]*(?:=\S+)?(?:\s+(?!-)\S+)?)*\s+commit\b(?!-)/i;

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

function isLiteralCatHeredoc(inspected) {
  if (inspected.statements.length !== 1 || !inspected.diagnostics.length
      || inspected.diagnostics.some(item => item.code !== 'UNSUPPORTED_HEREDOC')) return false;
  const statement = inspected.statements[0];
  if (statement.command?.value !== 'cat' || statement.assignments.length
      || statement.separator?.value !== '\n') return false;
  const heredocs = statement.redirects.filter(item => ['<<', '<<-'].includes(item.operator.value));
  return heredocs.length > 0 && statement.redirects.every(item => item.target?.static
    && (['<<', '<<-'].includes(item.operator.value)
      ? item.target.parts.some(part => part.quote !== 'unquoted' && !(part.quote === 'escape' && part.raw === '\\\n'))
      : item.operator.static));
}

/** Preserve one descriptor per commit statement; never merge by repository. */
function resolveCommitDescriptors(command, cwd) {
  const inspected = inspectCommand(command);
  // Quoting makes heredoc input literal only for a data consumer. Never apply this
  // exception to interpreters, pipelines, expansions or a following statement:
  // a quoted shell heredoc can still execute its body, unlike this single cat.
  if (isLiteralCatHeredoc(inspected)) return { known: true, descriptors: [] };
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
      '  4. Skip — only in risk-based mode for a Low-risk candidate (docs, comments, formatting, copy or a really small edit) or on the user\'s explicit request; mint a descriptor-bound skip that records the reason:',
      '',
      `  node .claude/hooks/lib/review-receipt.cjs snapshot --target=commit-descriptor --descriptor-json=${shellQuote(JSON.stringify(descriptor))}`,
      '  node .claude/hooks/lib/review-receipt.cjs issue --kind=skip --scope=full-changeset --snapshot-json=\'<exact snapshot JSON returned above>\' --reason="auto: low risk — <signal>"',
      '',
      'Use --reason="user approved skip" when the user asked for the skip. Never skip a Medium or High candidate, or a failed review. Lightweight mode never selects an automatic skip.',
      'Use this exact descriptor for the snapshot and commit. The `skip` shorthand captures only the worktree and may not match this commit candidate.'
    ]
    : [
      'Skip is unavailable because this Git context has no supported exact commit descriptor. Use the `commit` skill to prepare a supported candidate, then gate that exact candidate by its risk tier.'
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
    'A commit MUST be preceded by the configured review over this exact full candidate. Default commit.reviewMode is lightweight.',
    'Do not ask the user: classify the actual candidate risk',
    '(risk tier; higher on a tie) and resolve commit.reviewMode with .claude/scripts/lib/commit-review-policy.cjs. A fix-loop issues the receipt; then retry the commit:',
    '',
    '  1. /commit-review --fix-loop   # default lightweight: every commit tier',
    '  2. /why-review --fix-loop      # risk-based mode or PR scope: medium risk',
    '  3. /changes-review --fix-loop  # risk-based mode or PR scope: high risk; explicit review requests also apply',
    '',
    'Each fix-loop runs at most 3 review rounds. MEDIUM+ findings still open at the cap: stop and report, no commit, no skip.',
    '/workflow-review-changes --fix-loop also issues a valid receipt when the user asks for the full workflow.',
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

// ---- Pull-request gate (reviewGate.mode: enforce) ------------------------------------------------

const PR_GATED_SUBCOMMANDS = new Set(['create', 'ready']);
// `gh pr create|ready` in COMMAND position only: after a separator, a newline or a subshell opener,
// optionally behind a wrapper. Matched on the command with quoted text and heredoc bodies blanked,
// so a quoted mention in a search, a message or a document is not a pull request (the commit gate's
// adjacency rule holds the same line). An interpreter's -c string runs, so it is matched raw.
const GH_PR_POSITION = '(?:(?:env|command|exec|nohup|time|timeout)\\s+(?:(?:-\\S+|\\w+=\\S*|\\d+\\S*)\\s+)*)?gh(?:\\.exe)?\\s+pr\\s+(?:create|ready)\\b';
const GH_PR_TEXT_RE = new RegExp(`(?:^|[;&|(\\n\`]|\\$\\()\\s*${GH_PR_POSITION}`, 'i');
// A shell's -c string (sh, bash, zsh, ksh, dash; clustered flags such as -lc included) runs its text.
const GH_PR_INTERPRETER_RE = new RegExp(`(?:^|[\\s;&|(])(?:\\S*[\\\\/])?(?:ba|z|k|da)?sh(?:\\.exe)?(?:\\s+-[A-Za-z]+)*\\s+-[A-Za-z]*c[A-Za-z]*\\s+['"](?:[^'"]*?[;&|(\\n])?\\s*${GH_PR_POSITION}`, 'i');
const LITERAL_CD_RE = /(?:^|[;&|(\s'"])(?:cd|pushd)\s+(['"]?)([^\s'";&|)]+)\1/g;
const COMMAND_WRAPPERS = new Set(['env', 'command', 'exec', 'nohup', 'time', 'timeout']);
// Wrapper options that take a separate value: env -u NAME, env -C DIR, timeout -s SIGNAL, timeout -k DURATION.
const WRAPPER_VALUE_OPTIONS = { env: new Set(['-u', '--unset', '-C', '--chdir', '-S', '--split-string']), timeout: new Set(['-s', '--signal', '-k', '--kill-after']) };

/**
 * The command with literal text blanked, keeping what the shell would run: quoted spans and quoted
 * heredoc bodies become spaces, while a `$(…)` or backtick substitution inside double quotes or an
 * unquoted heredoc body stays live text. Quote state carries across lines; separators and newlines
 * are kept, so command positions still read.
 */
function blankQuotedText(command) {
  const state = { quote: null, live: [] };
  const heredocs = []; // pending bodies: { delimiter, live }
  let out = '';
  for (const line of command.split('\n')) {
    // A heredoc body starts after the line that opened it ends outside a quote (inside $(…) too).
    if (heredocs.length && state.quote === null) {
      const current = heredocs[0];
      if (line.replace(/^\t+/, '') === current.delimiter) {
        heredocs.shift();
        out += `${' '.repeat(line.length)}\n`;
        continue;
      }
      // An unquoted heredoc expands substitutions in its body, like a double-quoted string.
      out += `${current.live ? blankLine(line, { quote: '"', live: [] }, []) : ' '.repeat(line.length)}\n`;
      continue;
    }
    out += `${blankLine(line, state, heredocs)}\n`;
  }
  return out;
}

/** One line of `blankQuotedText`; `state` (quote, open substitutions) carries to the next line. */
function blankLine(line, state, heredocs) {
  let out = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (state.quote === "'") {
      if (ch === "'") state.quote = null;
      out += ' ';
      continue;
    }
    if (state.quote === '"') {
      if (ch === '\\') { out += '  '; i++; continue; }
      if (ch === '$' && line[i + 1] === '(') { state.live.push({ depth: 1 }); state.quote = null; out += '$('; i++; continue; }
      if (ch === '`') { state.live.push({ tick: true }); state.quote = null; out += '`'; continue; }
      if (ch === '"') state.quote = null;
      out += ' ';
      continue;
    }
    const frame = state.live[state.live.length - 1];
    if (frame?.tick && ch === '`') { state.live.pop(); state.quote = '"'; out += '`'; continue; }
    if (frame?.depth) {
      if (ch === '(') frame.depth++;
      if (ch === ')' && --frame.depth === 0) { state.live.pop(); state.quote = '"'; out += ')'; continue; }
    }
    if (ch === '\\') { out += '  '; i++; continue; }
    if (ch === "'" || ch === '"') { state.quote = ch; out += ' '; continue; }
    const heredoc = /^<<-?\s*(['"]?)([A-Za-z_]\w*)\1/.exec(line.slice(i));
    if (heredoc) {
      heredocs.push({ delimiter: heredoc[2], live: heredoc[1] === '' });
      out += ' '.repeat(heredoc[0].length);
      i += heredoc[0].length - 1;
      continue;
    }
    out += ch;
  }
  return out;
}
// Git steps that move HEAD or the branch; a pull request in the same command would publish a head this gate never saw.
const HEAD_MOVING_GIT = new Set(['pull', 'rebase', 'merge', 'cherry-pick', 'am', 'reset', 'checkout', 'switch', 'commit', 'revert', 'stash']);
const PR_VALUE_FLAGS = new Set(['--title', '-t', '--body', '-b', '--body-file', '-F', '--assignee', '-a',
  '--label', '-l', '--milestone', '-m', '--project', '-p', '--reviewer', '-r', '--template', '-T', '--recover']);

function optionValue(args, index, name) {
  const arg = args[index];
  if (arg.startsWith(`${name}=`)) return { value: arg.slice(name.length + 1), next: index };
  if (arg === name) return { value: args[index + 1], next: index + 1 };
  // A short option with its value attached: -Bdevelop.
  if (name.length === 2 && arg.startsWith(name) && arg.length > 2) return { value: arg.slice(2), next: index };
  return null;
}

/** What one `gh pr create|ready` statement asks for, or why it cannot be checked. */
function parsePrStatement(argv) {
  const sub = argv[2];
  const args = argv.slice(3);
  const parsed = { sub, base: null, head: null, positional: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg !== 'string') return { error: 'A dynamic gh pr argument cannot be checked; write it literally' };
    if (arg === '-R' || arg.startsWith('-R') || arg === '--repo' || arg.startsWith('--repo=')) {
      return { error: 'gh pr with --repo targets a repository this checkout cannot prove; run it from that repository\'s checkout' };
    }
    if (sub === 'ready' && arg === '--undo') return { allow: true }; // back to draft: nothing is published
    // A draft asks for no merge; `gh pr ready` is gated when it does.
    if (sub === 'create' && (arg === '--draft' || arg === '-d')) return { allow: true };
    let consumed = false;
    for (const [name, key] of [['--base', 'base'], ['-B', 'base'], ['--head', 'head'], ['-H', 'head']]) {
      const found = optionValue(args, i, name);
      if (!found) continue;
      if (typeof found.value !== 'string' || !found.value) return { error: `gh pr ${name} needs a literal value` };
      parsed[key] = found.value;
      i = found.next;
      consumed = true;
      break;
    }
    if (consumed) continue;
    const flag = arg.includes('=') ? arg.slice(0, arg.indexOf('=')) : arg;
    if (PR_VALUE_FLAGS.has(flag)) { if (!arg.includes('=')) i++; continue; }
    if (arg.startsWith('-')) continue; // boolean flags: --draft, --fill, --web, --dry-run …
    parsed.positional.push(arg);
  }
  return parsed;
}

/** The Git subcommand after global options; -C, -c and --exec-path style options take a value. */
function gitSubcommand(argv) {
  for (let i = 1; i < argv.length; i++) {
    const value = argv[i];
    if (typeof value !== 'string') return null;
    if (value === '-C' || value === '-c' || value === '--git-dir' || value === '--work-tree' || value === '--namespace') { i++; continue; }
    if (value.startsWith('-')) continue;
    return value;
  }
  return null;
}

const baseName = value => String(value || '').split(/[\\/]/).pop().replace(/\.exe$/i, '').toLowerCase();

/** Drop env/command/exec/nohup/time wrappers; collect the variables an env wrapper sets. */
function unwrapCommand(argv, assignments) {
  const names = assignments.map(item => item?.name).filter(Boolean);
  let rest = argv;
  while (rest.length && COMMAND_WRAPPERS.has(baseName(rest[0]))) {
    const wrapper = baseName(rest[0]);
    rest = rest.slice(1);
    while (rest.length && typeof rest[0] === 'string' && (rest[0].startsWith('-') || (wrapper === 'env' && /^\w+=/.test(rest[0])))) {
      if (wrapper === 'env' && /^\w+=/.test(rest[0])) names.push(rest[0].slice(0, rest[0].indexOf('=')));
      rest = rest.slice(WRAPPER_VALUE_OPTIONS[wrapper]?.has(rest[0]) ? 2 : 1);
    }
    if (wrapper === 'timeout' && rest.length) rest = rest.slice(1); // the duration operand
  }
  return { argv: rest, names };
}

/**
 * Every gated `gh pr` statement with the directory it runs in. A literal `cd`/`pushd` before it is
 * followed; an unresolvable one leaves `dir` null. `headMoved` marks a Git step that moves the branch
 * earlier in the same command.
 */
function prStatements(command, cwd) {
  const inspected = inspectCommand(command);
  const found = [];
  let dir = cwd;
  let headMoved = false;
  for (const statement of inspected.statements) {
    const { argv, names } = unwrapCommand(tokenValues(statement.argv), statement.assignments || []);
    const name = baseName(argv[0]);
    if (name === 'cd' || name === 'pushd') {
      // Follow only a literal directory that exists; an expansion, ~ or a missing path is unknown.
      const token = (statement.argv || [])[1];
      const target = typeof token === 'object' && token?.static === false ? null : argv[1];
      const next = typeof target === 'string' && target && !target.startsWith('~') && dir ? require('node:path').resolve(dir, target) : null;
      dir = next && require('node:fs').existsSync(next) ? next : null;
      continue;
    }
    if (name === 'popd') { dir = null; continue; }
    if (name === 'git' && HEAD_MOVING_GIT.has(gitSubcommand(argv))) headMoved = true;
    if (name === 'gh' && argv[1] === 'pr' && PR_GATED_SUBCOMMANDS.has(argv[2])) found.push({ argv, dir, headMoved, ghRepo: names.includes('GH_REPO') });
  }
  const unclear = inspected.status !== 'KNOWN' && found.length === 0 &&
    (GH_PR_TEXT_RE.test(blankQuotedText(command)) || GH_PR_INTERPRETER_RE.test(command));
  // Literal cd targets anywhere in an unreadable command, subshells and -c strings included.
  const cdTargets = unclear ? [...command.matchAll(LITERAL_CD_RE)].map(match => match[2]) : [];
  return { found, unclear, cdTargets };
}

function prBlockMessage(repository, base, reason) {
  const shellQuote = value => `'${String(value).replace(/'/g, "'\\''")}'`;
  return [
    '[BLOCKED] Pull request refused — reviewGate.mode is enforce and the branch has no whole-branch review receipt.',
    '',
    `Repository: ${repository}`,
    ...(base ? [`Base: ${base}`] : []),
    ...(reason ? [`Reason: ${reason}`] : []),
    '',
    'Open pull requests through the `pull-request` skill: it reviews the whole branch by risk and records the receipt.',
    'The review must snapshot the whole branch, then commit everything it reviewed:',
    '',
    `  node .claude/hooks/lib/review-receipt.cjs snapshot --target=branch --base=${base ? shellQuote(base) : '<base-branch>'}`,
    '  /why-review --fix-loop (Medium) or /changes-review --fix-loop (High), over that branch snapshot',
    '',
    'A Low-risk branch, or the user\'s explicit request, may record a skip over the committed head:',
    `  node .claude/hooks/lib/review-receipt.cjs snapshot --target=branch --base=${base ? shellQuote(base) : '<base-branch>'} --committed`,
    '  node .claude/hooks/lib/review-receipt.cjs issue --kind=skip --scope=full-changeset --snapshot-json=\'<snapshot JSON>\' --reason="auto: low risk — <signal>"',
    '',
    'A review receipt counts only when a review skill run was attested before its snapshot; it cannot be minted by hand.'
  ].join('\n');
}

function prBaseName(repository, explicit) {
  if (explicit) return explicit;
  try {
    const routing = require('../scripts/lib/workflow-routing-config.cjs');
    const config = JSON.parse(routing.decodeConfigText(require('node:fs').readFileSync(routing.resolveProjectConfigPath(repository))));
    const target = config?.pullRequest?.targetBranch;
    if (typeof target === 'string' && target.trim()) return target.trim();
  } catch (_) { /* no project config: the documented default below */ }
  return 'main';
}

function evaluatePullRequest(command, cwd, dependencies) {
  const { found, unclear, cdTargets } = prStatements(command, cwd);
  if (!found.length && !unclear) return undefined;
  const locate = dependencies.findRepository || findRepository;
  const modeOf = dependencies.reviewGateMode || reviewGateMode;
  const block = (repository, base, reason) => ({ code: 2, stderr: `${prBlockMessage(repository, base, reason)}\n`, decision: 'block' });
  // The session's own repository, when it enforces (looked up once, only when needed).
  let sessionEnforcing;
  const enforcingSession = () => {
    if (sessionEnforcing === undefined) {
      const repository = locate(cwd);
      sessionEnforcing = repository && modeOf(repository) === 'enforce' ? repository : null;
    }
    return sessionEnforcing;
  };
  if (unclear) {
    // Every repository the command could reach: the session's, and any literal cd target in it.
    const nodePath = require('node:path');
    const nodeFs = require('node:fs');
    for (const target of cdTargets) {
      const candidate = nodePath.resolve(cwd, target);
      const repository = nodeFs.existsSync(candidate) ? locate(candidate) : null;
      if (repository && modeOf(repository) === 'enforce') {
        return block(repository, null, 'the gh pr command uses shell syntax this gate cannot read; run it as one literal statement from the repository\'s directory');
      }
    }
    // No repository, no project config: no team policy applies, and gh itself needs a repository.
    const repository = enforcingSession();
    if (!repository) return undefined;
    return block(repository, null, 'the gh pr command uses shell syntax this gate cannot read; write it as one literal statement');
  }
  for (const { argv, dir, headMoved, ghRepo } of found) {
    const parsed = parsePrStatement(argv);
    if (parsed.allow) continue; // a draft, or back to draft: no merge is asked for
    if (dir === null) {
      // A directory change this gate cannot follow: refuse only where the session's repository enforces.
      const fallback = enforcingSession();
      if (!fallback) continue;
      return block(fallback, null, 'a directory change this gate cannot follow precedes gh pr; run it from the repository\'s directory as its own command');
    }
    const repository = locate(dir);
    if (!repository) {
      // gh outside a repository acts only through --repo or GH_REPO; refuse that where the session enforces.
      const fallback = (parsed.error || ghRepo) ? enforcingSession() : null;
      if (fallback) return block(fallback, null, parsed.error || 'GH_REPO points gh at a repository this checkout cannot prove; run gh pr without it');
      continue;
    }
    const mode = modeOf(repository);
    if (mode !== 'enforce') continue;
    if (ghRepo) return block(repository, null, 'GH_REPO points gh at a repository this checkout cannot prove; run gh pr without it');
    if (headMoved) return block(repository, null, 'a Git step earlier in this command moves the branch; run gh pr as its own command once the branch is final');
    const branch = (dependencies.currentBranch || currentBranch)(repository);
    if (parsed.error) return { code: 2, stderr: `${prBlockMessage(repository, null, parsed.error)}\n`, decision: 'block' };
    if (!branch) return { code: 2, stderr: `${prBlockMessage(repository, null, 'HEAD is detached; check out the pull request branch')}\n`, decision: 'block' };
    if (parsed.head && parsed.head !== branch && !parsed.head.endsWith(`:${branch}`)) {
      return { code: 2, stderr: `${prBlockMessage(repository, null, `--head ${parsed.head} is not the checked-out branch ${branch}`)}\n`, decision: 'block' };
    }
    const other = parsed.positional.find(value => value !== branch);
    if (parsed.sub === 'ready' && other !== undefined) {
      return { code: 2, stderr: `${prBlockMessage(repository, null, `gh pr ready ${other} names a pull request other than the checked-out branch; run it from that branch without an argument`)}\n`, decision: 'block' };
    }
    const base = prBaseName(repository, parsed.base);
    const capture = dependencies.captureReviewTarget || captureReviewTarget;
    let snapshot;
    try {
      snapshot = capture({ repository, cwd: repository, target: 'branch', descriptor: { base, committed: true } });
    } catch (error) {
      reportHookInternalError('review-commit-gate', 'branch capture failed', error);
      snapshot = { status: 'ERROR', errorMessage: 'branch candidate could not be computed' };
    }
    if (!snapshot || snapshot.status === 'ERROR') {
      return { code: 2, stderr: `${prBlockMessage(repository, base, snapshot?.errorMessage || 'branch candidate could not be computed')}\n`, decision: 'block' };
    }
    if (snapshot.status === 'CLEAN') continue; // nothing on the branch beyond the base
    const receipt = { repository, snapshot, reviewGateMode: mode };
    if (matchReviewReceipt(receipt) || matchSkipReceipt(receipt)) continue;
    return block(repository, base);
  }
  return undefined;
}

/**
 * A whole-branch review (the pull-request skill's) also authorizes the commit that records it: its
 * base is the merge-base, its candidate the reviewed working tree. When that tree is exactly this
 * commit's candidate, the commit adds nothing the review did not see. Any other branch state misses.
 */
function branchReceiptCovers(repository, snapshot, capture) {
  try {
    if (snapshot.descriptor?.amend) return false; // an amend rewrites history the branch review measured
    if (!hasAnyReceipt(repository)) return false; // nothing stored: skip the full branch capture
    const branch = capture({ repository, cwd: repository, target: 'branch', descriptor: { base: prBaseName(repository) } });
    if (!branch || branch.status !== 'CHANGED' || branch.candidateTree !== snapshot.candidateTree) return false;
    const receipt = { repository, snapshot: branch };
    return Boolean(matchReviewReceipt(receipt) || matchSkipReceipt(receipt));
  } catch (_) {
    return false;
  }
}

function evaluate(input, dependencies = {}) {
  if (input?.tool_name !== 'Bash') return undefined;
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || command.length === 0) return undefined;
  if (/\bgh\b/.test(command) && /\bpr\b/.test(command)) {
    const pullRequest = evaluatePullRequest(command, statementCwd(input), dependencies);
    if (pullRequest) return pullRequest;
  }
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
    if (branchReceiptCovers(repository, snapshot, capture)) continue;

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

module.exports = { evaluate, resolveCommitDescriptors, parseCommitDescriptor, blockMessage, parsePrStatement, evaluatePullRequest, blankQuotedText };
