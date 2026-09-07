#!/usr/bin/env node
'use strict';

/**
 * Process-level tests for git-commit-block.cjs. All repositories, lease stores
 * and markers are synthetic temp fixtures. Policy commands are JSON input;
 * explicit argv-only Git semantic controls run in a separate owned temp repo.
 */
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { issueLease, revokeLease } = require('../lib/git-operation-lease.cjs');
const { inspectCommand } = require('../lib/command-inspection.cjs');
const { resolveGitStatement } = require('../git-commit-block.cjs');

const shellPath = value => `'${value.replace(/'/g, `'"'"'`)}'`;
const canonical = value => {
  const resolved = fs.realpathSync.native(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

const HOOK = path.resolve(__dirname, '..', 'git-commit-block.cjs');
let passed = 0;
let failed = 0;
const verbose = process.argv.includes('--verbose');

function logResult(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  [PASS] ${name}`); }
  else { failed++; console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`); }
}

function runHook(input, env = {}) {
  return new Promise(resolve => {
    const proc = spawn(process.execPath, [HOOK], { env: { ...process.env,
      GIT_DIR: undefined, GIT_WORK_TREE: undefined, GIT_COMMON_DIR: undefined, ...env },
      stdio: ['pipe', 'pipe', 'pipe'], timeout: 5000, windowsHide: true });
    let stdout = ''; let stderr = '';
    proc.stdout.on('data', chunk => { stdout += chunk; });
    proc.stderr.on('data', chunk => { stderr += chunk; });
    proc.on('close', code => resolve({ code, stdout, stderr }));
    proc.on('error', error => resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` }));
    proc.stdin.end(JSON.stringify(input));
  });
}

function bashInput(command, fixture, sessionId = '') {
  return { tool_name: 'Bash', session_id: sessionId, cwd: fixture.repo,
    tool_input: { command } };
}

async function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'git-policy-test-'));
  const repo = path.join(root, 'repo');
  const foreign = path.join(root, 'foreign repo');
  const store = path.join(root, 'leases');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  fs.mkdirSync(path.join(foreign, '.git'), { recursive: true });
  fs.mkdirSync(store);
  const session = `session-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const context = { root, repo, foreign, store, session };
  try { await fn(context); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

async function run() {
  console.log('=== git-commit-block.cjs Test Suite ===\n');
  await fixture(async f => {
    const env = { CLAUDE_PROJECT_DIR: f.repo, CK_GIT_LEASE_STORE: f.store };
    console.log('\n--- Deny-wins protected policy ---');
    for (const command of ['git commit -m test', 'git push', 'git add .', 'git status && git push', 'git add --dry-run .; git push']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK: ${command}`, result.code === 2, result.stderr);
    }
    const amend = await runHook(bashInput('git commit --amend', f, f.session), env);
    logResult('BLOCK: --amend is unconditional', amend.code === 2 && amend.stderr.includes('never allowed'));

    // Invariant: operand text and uninspectable input never grant authority.
    for (const command of ['git add -- --dry-run', 'git add -- -n',
      'git add --pathspec-from-file --dry-run', 'git add --chmod --dry-run',
      'git add --pathspec-from-file=--dry-run', 'git add --dry-run --no-dry-run .',
      'git.exe push', 'git.exe add file', 'git.exe commit --amend',
      '"C:/Program Files/Git/bin/git.exe" push', 'env git.exe push',
      `${' '.repeat(65536)}git push`]) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK authority regression: ${command.length > 100 ? 'oversize command' : command}`, result.code === 2, result.stderr);
    }
    for (const command of ['git add --dry-run .', 'git add -n .', 'git --no-pager add --dry-run .',
      'git add --pathspec-from-file paths.txt --dry-run', '# only a comment', 'echo git', 'which git', 'grep git README.md',
      'git.exe status', 'git --no-pager stash list', 'git -c color.ui=false stash show',
      `git -C "${f.repo}" branch -a`, `git --git-dir="${path.join(f.repo, '.git')}" tag --list`,
      'git --no-pager config --get user.name', 'git --no-pager remote -v']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW authority control: ${command}`, result.code === 0, result.stderr);
    }
    for (const command of ['git --no-pager stash push', 'git -c color.ui=false config user.name value',
      'git --no-pager branch -D topic', 'git --no-pager tag -d v1', 'git --no-pager remote remove origin',
      'git --work-tree=missing branch -D topic', 'git --git-dir=missing tag -d v1',
      'git --work-tree=missing remote remove origin']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK global-option mutator: ${command}`, result.code === 2, result.stderr);
    }

    console.log('\n--- Read-only and effect-aware policy ---');
    // Invariant: output modifiers do not turn branch creation/config writes into reads.
    for (const command of ['git config edit', 'git config edit --local', 'git config --local edit',
      'git branch -v topic', 'git branch -vv topic', 'git branch --verbose topic',
      'git branch --color=always topic', 'git branch topic -v', 'git branch --column topic',
      'git branch --sort refname topic', 'git config --show-scope user.name value',
      'git config --show-origin user.name value', 'git config --name-only user.name value',
      'git config --get --unset user.name', 'git config --file --get user.name value']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK display/action confusion: ${command}`, result.code === 2 && result.stdout === '', result.stderr);
    }
    for (const command of ['git config list', 'git config get user.name', 'git config get --show-scope user.name',
      'git branch -v', 'git branch --color=always', 'git branch --column',
      'git branch --sort refname', 'git branch --list topic -v', 'git branch -v --list topic',
      'git config --show-scope user.name', 'git config --show-origin --get user.name',
      'git config --name-only --list', 'git config --file config.txt --get user.name',
      'git config --file=config.txt user.name']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW display/read control: ${command}`, result.code === 0 && result.stdout === '', result.stderr);
    }
    for (const command of ['git status', 'git diff --stat', 'git log -1', 'git show HEAD', 'git branch -a', 'git remote -v',
      'git rev-parse HEAD', 'git describe --tags', 'git tag -l', 'git blame file', 'git check-ignore file', 'git ls-files',
      'git stash list', 'git stash show', 'git config --get user.name', 'git config user.name']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW: ${command}`, result.code === 0, result.stderr);
    }
    for (const command of ['git fetch --all', 'git restore file', 'git reset HEAD -- file', 'git stash push', 'git config user.name value', 'git checkout -b branch']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK mutating: ${command}`, result.code === 2, result.stderr);
    }
    for (const command of ['git branch -D topic', 'git branch -m old new', 'git tag -a v1 -m release',
      'git tag -d v1', 'git remote add attacker https://example.invalid/repo.git',
      'git remote set-url origin https://example.invalid/repo.git', 'git stash']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK selector mutator: ${command}`, result.code === 2, result.stderr);
    }

    console.log('\n--- Shell wrappers and opaque Git syntax ---');
    for (const command of ['env git push', 'command git push', 'sudo git commit -m x',
      'echo $(git push)', 'sh -c "git commit -m x"', 'git commit $(printf --amend) -m x',
      `GIT_DIR="$(pwd)/${path.basename(f.foreign)}/.git" git commit -m x`]) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK wrapper/opaque: ${command}`, result.code === 2, result.stderr);
    }
    for (const command of ['git branch -a', 'git branch --list topic', 'git tag -l', 'git remote -v',
      'git stash list', 'git stash show']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW read selector: ${command}`, result.code === 0, result.stderr);
    }

    console.log('\n--- Global options and effective repository ---');
    for (const command of [`git -C ${shellPath(f.foreign)} commit -m x`, `git --git-dir=${shellPath(f.foreign)} commit -m x`,
      `GIT_DIR=${shellPath(f.foreign)} git commit -m x`, `git -C ${shellPath(f.repo)} -C ${shellPath(f.foreign)} push`,
      'git -C missing commit -m x', 'git --git-dir commit -m x']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK target: ${command}`, result.code === 2, result.stderr);
    }
    for (const command of ['echo "git push"', 'cat README.md | grep "git commit"', 'git status && git diff']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW inert/read-only: ${command}`, result.code === 0, result.stderr);
    }

    console.log('\n--- Exact session/repository/operation lease ---');
    const lease = issueLease({ projectDir: f.repo, repository: f.repo, sessionId: f.session,
      sourceRequest: 'synthetic explicit request', operations: ['commit', 'add'], storeDir: f.store });
    const editWithLease = await runHook(bashInput('git config edit', f, f.session), env);
    logResult('config edit cannot borrow a valid add/commit lease', editWithLease.code === 2 && editWithLease.stdout === '', editWithLease.stderr);
    // Invariant: initial-repository consent cannot authorize an unknown shell cwd.
    fs.mkdirSync(path.join(f.repo, 'nested', '.git'), { recursive: true });
    for (const command of ['cd nested && git add x', 'pushd nested; git commit -m x',
      'popd; git add x', 'false && cd nested; git add x', 'cd missing || git add x',
      'cd nested && git.exe add x', 'builtin cd nested; git add x', 'command cd nested; git add x',
      'eval "cd nested"; git add x']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK navigation with lease: ${command}`, result.code === 2 && result.stderr.includes('git -C'), result.stderr);
    }
    for (const command of [`git -C "${f.repo}" add file`, 'git.exe add file', 'git commit -m x']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW explicit-scope control: ${command}`, result.code === 0, result.stderr);
    }

    // Invariant: amend stays unbypassable while a valid commit lease is held. Git resolves any
    // unambiguous prefix of a long option, so --am/--ame/--amen rewrite history exactly as
    // --amend does; matching the literal spelling alone let an abbreviation fall through to the
    // lease-authorized 'protected' path.
    for (const command of ['git commit --amend', 'git commit --amen --no-edit', 'git commit --ame --no-edit',
      'git commit --am --no-edit', 'git commit --amend=x', 'git commit -m x --amen',
      'git commit --no-edit --am', 'git commit --author me --amend', 'git commit --amend -- --amend']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK amend abbreviation with lease: ${command}`, result.code === 2 && result.stderr.includes('never allowed'), result.stderr);
    }
    // Invariant: the amend rule reads options only — operand text and option VALUES that merely
    // spell --amend are ordinary commits the lease already authorizes.
    for (const command of ['git commit -m "--amend"', 'git commit -- --amend', 'git commit --message --amend',
      'git commit -m "--am" -- --amen']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW amend look-alike operand: ${command}`, result.code === 0, result.stderr);
    }
    for (const [command, sid, expected] of [
      ['git commit -m x', f.session, 0], ['git add file', f.session, 0],
      ['git push', f.session, 2], ['git commit -m x', `${f.session}-other`, 2]
    ]) {
      const result = await runHook(bashInput(command, f, sid), env);
      logResult(`LEASE ${command} (${sid === f.session ? 'matching' : 'wrong session'})`, result.code === expected, result.stderr);
    }
    const foreignCommand = `git -C ${shellPath(f.foreign)} commit -m x`;
    const parsedForeign = resolveGitStatement(inspectCommand(foreignCommand).statements[0], f.repo, {});
    logResult('quoted foreign path resolves to the exact repository', parsedForeign.known && canonical(parsedForeign.repository) === canonical(f.foreign));
    const wrongLeaseResult = await runHook(bashInput(foreignCommand, f, f.session), env);
    logResult('LEASE wrong repository is denied', wrongLeaseResult.code === 2, wrongLeaseResult.stderr);
    // Invariant: worktree identity must not hide storage selected from another repository.
    const mixedCommands = [
      `git --git-dir=${shellPath(path.join(f.foreign, '.git'))} --work-tree=${shellPath(f.repo)} commit -m x`,
      `git --work-tree=${shellPath(f.foreign)} commit -m x`,
      'git --bare commit -m x',
      `GIT_DIR=${shellPath(path.join(f.foreign, '.git'))} GIT_WORK_TREE=${shellPath(f.repo)} git commit -m x`,
      `GIT_COMMON_DIR=${shellPath(path.join(f.foreign, '.git'))} git commit -m x`
    ];
    const foreignLease = issueLease({ projectDir: f.repo, repository: f.foreign, sessionId: f.session,
      sourceRequest: 'synthetic foreign', operations: ['commit'], storeDir: f.store });
    const foreignResult = await runHook(bashInput(foreignCommand, f, f.session), env);
    logResult('LEASE exact foreign repository is allowed', foreignResult.code === 0, foreignResult.stderr);
    for (const command of mixedCommands) {
      const resolved = resolveGitStatement(inspectCommand(command).statements[0], f.repo, {});
      logResult(`mixed target resolver rejects: ${command}`, !resolved.known);
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`mixed target process denies: ${command}`, result.code === 2, result.stderr);
    }
    const redirectedEnv = { ...env, GIT_DIR: path.join(f.foreign, '.git'), GIT_WORK_TREE: f.repo };
    const inheritedRedirect = await runHook(bashInput('git commit -m x', f, f.session), redirectedEnv);
    logResult('inherited mixed Git storage cannot borrow a worktree lease', inheritedRedirect.code === 2, inheritedRedirect.stderr);
    const explicitOverride = await runHook(bashInput(`git --git-dir=${shellPath(path.join(f.repo, '.git'))} commit -m x`, f, f.session), redirectedEnv);
    logResult('explicit Git directory overrides inherited storage when worktree matches', explicitOverride.code === 0, explicitOverride.stderr);
    const linked = path.join(f.root, 'linked worktree');
    const linkedStorage = path.join(f.repo, '.git', 'worktrees', 'linked');
    fs.mkdirSync(linked);
    fs.mkdirSync(linkedStorage, { recursive: true });
    fs.writeFileSync(path.join(linked, '.git'), `gitdir: ${linkedStorage}\n`);
    fs.writeFileSync(path.join(linkedStorage, 'commondir'), '../..\n');
    const linkedLease = issueLease({ projectDir: f.repo, repository: linked, sessionId: f.session,
      sourceRequest: 'synthetic linked', operations: ['commit'], storeDir: f.store });
    for (const command of [
      `git --git-dir=${shellPath(path.join(f.foreign, '.git'))} --work-tree=${shellPath(f.foreign)} commit -m x`,
      `git -C ${shellPath(linked)} commit -m x`,
      `git -C ${shellPath(f.repo)} --git-dir=.git commit -m x`,
      `git -C ${shellPath(f.repo)} --work-tree=. commit -m x`,
      `git --git-dir=${shellPath(linkedStorage)} --work-tree=${shellPath(linked)} commit -m x`
    ]) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`matching storage/worktree is allowed: ${command}`, result.code === 0, result.stderr);
    }
    const linkedCommand = `git -C ${shellPath(linked)} commit -m x`;
    fs.writeFileSync(path.join(linked, '.git'), `gitdir: ${path.relative(linked, linkedStorage)}\n`);
    const relativeLinkResult = await runHook(bashInput(linkedCommand, f, f.session), env);
    logResult('relative linked gitfile preserves exact worktree lease', relativeLinkResult.code === 0, relativeLinkResult.stderr);
    for (const marker of ['not a Git marker', 'gitdir: missing\n', `gitdir: ${'x'.repeat(4096)}`]) {
      fs.writeFileSync(path.join(linked, '.git'), marker);
      const result = await runHook(bashInput(linkedCommand, f, f.session), env);
      logResult('malformed or unresolved linked gitfile cannot authorize a lease', result.code === 2, result.stderr);
    }
    revokeLease({ projectDir: f.repo, repository: linked, sessionId: f.session, leaseId: linkedLease.leaseId, storeDir: f.store });
    revokeLease({ projectDir: f.repo, repository: f.repo, sessionId: f.session, leaseId: lease.leaseId, storeDir: f.store });
    revokeLease({ projectDir: f.repo, repository: f.foreign, sessionId: f.session, leaseId: foreignLease.leaseId, storeDir: f.store });
    const after = await runHook(bashInput('git commit -m x', f, f.session), env);
    logResult('LEASE revoked immediately denies', after.code === 2, after.stderr);

    console.log('\n--- Marker and input isolation ---');
    const marker = path.join(f.repo, 'tmp', 'claude-temp', '.commit-skill-active');
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, 'legacy marker');
    const markerResult = await runHook(bashInput('git commit -m x', f, f.session), env);
    logResult('legacy marker cannot authorize Git', markerResult.code === 2, markerResult.stderr);
    fs.rmSync(path.dirname(marker), { recursive: true, force: true });
    const nonBash = await runHook({ tool_name: 'Read', tool_input: { file_path: 'file' } }, env);
    logResult('non-Bash passthrough', nonBash.code === 0);
    const malformed = await runHook({ tool_name: 'Bash', tool_input: { command: 42 } }, env);
    logResult('non-string command is denied with a diagnostic', malformed.code === 2 && malformed.stderr.includes('Unable to evaluate'));
    const message = await runHook(bashInput('git commit -m x', f), env);
    logResult('missing session denies protected operation', message.code === 2 && message.stderr.includes('scoped authority'));
    if (verbose) console.log(message.stderr);
  });
  await realGitDisplayControls();
  displayClassifierMutants();
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed ? 1 : 0);
}

async function realGitDisplayControls() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'git-display-control-'));
  try {
    // No inherited repository/config identity, user hooks, signing or external shell.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
    Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(root, 'global'),
      GIT_AUTHOR_NAME: 'Synthetic', GIT_AUTHOR_EMAIL: 'synthetic@example.invalid',
      GIT_COMMITTER_NAME: 'Synthetic', GIT_COMMITTER_EMAIL: 'synthetic@example.invalid' });
    const git = (args, input) => {
      const result = spawnSync('git', args, { cwd: root, env, input, encoding: 'utf8', shell: false, windowsHide: true });
      assert.equal(result.status, 0, `${args.join(' ')}: ${result.error || result.stderr}`);
      return result.stdout.trim();
    };
    git(['init', '--quiet', '--template=']);
    const tree = git(['mktree'], '');
    const commit = git(['commit-tree', tree, '-m', 'synthetic fixture']);
    git(['update-ref', 'refs/heads/fixture', commit]);
    git(['symbolic-ref', 'HEAD', 'refs/heads/fixture']);
    git(['config', '--local', 'test.display', 'before']);
    const beforeRefs = git(['for-each-ref', '--format=%(refname):%(objectname)']);
    const beforeConfig = fs.readFileSync(path.join(root, '.git', 'config'), 'utf8');
    git(['branch', '-v']);
    assert.equal(git(['config', '--show-scope', 'test.display']), 'local\tbefore');
    assert.equal(git(['config', '--get', 'test.display']), 'before');
    assert.ok(git(['config', '--list']).split(/\r?\n/).includes('test.display=before'));
    assert.equal(git(['for-each-ref', '--format=%(refname):%(objectname)']), beforeRefs);
    assert.equal(fs.readFileSync(path.join(root, '.git', 'config'), 'utf8'), beforeConfig);
    git(['branch', '-v', 'created']);
    assert.equal(git(['rev-parse', 'refs/heads/created']), commit);
    git(['config', '--show-scope', 'test.display', 'after']);
    assert.equal(git(['config', '--get', 'test.display']), 'after');
    logResult('real isolated Git: display-only reads preserve state; added operands mutate branch/config', true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

function displayClassifierMutants() {
  const source = fs.readFileSync(HOOK, 'utf8');
  const mutations = [
    ['branch-display-as-action', "if (BRANCH_LIST_FLAGS.has(name)) listMode = true;", 'listMode = true;'],
    ['branch-ignore-operand', 'positional = true;', 'positional = false;'],
    ['branch-ignore-sort-value', "if (name === '--sort' && inline === undefined && args[++index] === undefined) return false;", ''],
    ['branch-ignore-list-mode', 'return listMode || !positional;', 'return !positional;'],
    ['config-display-as-action', 'return readAction || positional <= 1;', 'return true;'],
    ['config-drop-read-action', 'return readAction || positional <= 1;', 'return positional <= 1;'],
    ['config-ignore-value-arity', 'if (CONFIG_VALUE_OPTIONS.has(name)) {\n      if (inline === undefined && !argv[++index]?.static) return false;', 'if (CONFIG_VALUE_OPTIONS.has(name)) {'],
    ['config-ignore-terminator', "if (!optionsEnded && value === '--') { optionsEnded = true; continue; }", ''],
    ['config-ignore-display', 'if (CONFIG_DISPLAY_FLAGS.has(value)) continue;', ''],
    ['config-modern-write-as-read', "if (['edit', 'set', 'unset', 'rename-section', 'remove-section'].includes(value)) return false;", ''],
    ['config-action-in-value', 'if (positional === 0 && !readAction) {', 'if (!readAction) {'],
    ['config-legacy-read-as-action', 'if (positional === 0 && !readAction) {', 'if (positional === 0) {'],
    ['config-drop-modern-read', "if (['get', 'list'].includes(value)) { readAction = true; continue; }", ''],
    ['config-ignore-operand', 'positional++; continue;', 'continue;']
  ];
  const oracle = api => {
    for (const [command, expected] of [['git branch -v topic', false], ['git branch -v', true],
      ['git branch --sort refname', true], ['git branch --sort', false], ['git branch --sort=refname', true],
      ['git branch --list topic -v', true], ['git branch topic --list', true],
      ['git config --show-scope user.name value', false], ['git config --show-scope user.name', true],
      ['git config --get-regexp user.name pattern', true], ['git config --get --unset user.name', false],
      ['git config --file config.txt user.name', true], ['git config --file', false],
      ['git config --file=config.txt user.name', true], ['git config -- user.name', true],
      ['git config -- user.name --get', false], ['git config --unknown user.name', false],
      ['git config edit', false], ['git config --local edit', false], ['git config list', true],
      ['git config get user.name', true], ['git config --get user.name', true],
      ['git config --get-regexp edit', true], ['git config user.name edit', false],
      ['git config user.name get', false], ['git config --file edit user.name', true],
      ['git config set', false], ['git config unset', false], ['git config rename-section', false],
      ['git config remove-section', false]]) {
      const argv = inspectCommand(command).statements[0].argv;
      assert.equal(command.includes('branch') ? api.branchIsReadOnly(argv) : api.configIsReadOnly(argv), expected, command);
    }
    const config = command => api.configIsReadOnly(inspectCommand(command).statements[0].argv);
    for (const flag of ['--get', '--get-all', '--get-regexp', '--get-urlmatch', '--get-color', '--get-colorbool', '--list', '-l']) {
      assert.equal(config(`git config ${flag} test.key pattern`), true, flag);
    }
    for (const flag of ['--show-origin', '--show-scope', '--name-only', '--null', '-z', '--global', '--system',
      '--local', '--worktree', '--includes', '--no-includes', '--bool', '--int', '--bool-or-int', '--path', '--expiry-date']) {
      assert.equal(config(`git config ${flag} test.key`), true, flag);
      assert.equal(config(`git config ${flag} test.key value`), false, flag);
    }
    for (const flag of ['--file', '-f', '--blob', '--type', '--default']) {
      assert.equal(config(`git config ${flag} argument test.key`), true, flag);
      assert.equal(config(`git config ${flag}=argument test.key`), true, flag);
      assert.equal(config(`git config ${flag}`), false, flag);
    }
    const dynamic = inspectCommand('git config test.key').statements[0].argv;
    dynamic[2] = { ...dynamic[2], static: false };
    assert.equal(api.configIsReadOnly(dynamic), false, 'dynamic config token');
    for (const flag of ['-a', '--all', '-r', '--remotes', '--show-current', '--contains', '--merged',
      '--no-merged', '--points-at', '--list', '-l', '--format']) {
      assert.equal(api.branchIsReadOnly(inspectCommand(`git branch ${flag} topic`).statements[0].argv), true, flag);
    }
  };
  oracle(require(HOOK));
  for (const [name, anchor, replacement] of mutations) {
    assert.equal(source.split(anchor).length - 1, 1, `Unique mutation anchor: ${name}`);
    const sandbox = { require: createRequire(HOOK), module: { exports: {} }, process, Buffer, __filename: HOOK, __dirname: path.dirname(HOOK) };
    new vm.Script(source.replace(anchor, replacement), { filename: `mutant-${name}.cjs` }).runInNewContext(sandbox);
    assert.throws(() => oracle(sandbox.module.exports), { code: 'ERR_ASSERTION' }, name);
    logResult(`KILLED classifier mutant: ${name}`, true);
  }
}

run().catch(error => { console.error(error); process.exit(1); });
