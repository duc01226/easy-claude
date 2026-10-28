'use strict';

// Only synthetic repositories owned by this process are ever changed or removed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { materialize } = require('./files.cjs');
const { protect } = require('./private-files.cjs');
const owned = new Set();

function gitEnv(env = process.env) {
    return { ...Object.fromEntries(Object.entries(env).filter(([key]) => !/^GIT_/i.test(key))), GIT_CONFIG_NOSYSTEM: '1' };
}

// A full checkout of a large consumer snapshot (up to 12,000 files) on a busy machine with on-access
// antivirus scanning exceeded 30 s; a slow checkout is not a failed experiment.
const GIT_TIMEOUT_MS = 120000;

function git(repo, args, runCommand = execFileSync) {
    return runCommand('git', ['-c', 'core.autocrlf=false', '-c', `core.hooksPath=${path.join(path.dirname(repo), 'no-hooks')}`, '-C', repo, ...args], {
        env: { ...gitEnv(), GIT_CONFIG_GLOBAL: path.join(path.dirname(repo), 'no-global-config') }, encoding: 'utf8', timeout: GIT_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024
    });
}

function create(entries, parent, { runCommand = execFileSync } = {}) {
    parent = fs.realpathSync(parent);
    const root = fs.mkdtempSync(path.join(parent, 'native-'));
    protect(root);
    const session = { id: crypto.randomUUID(), root, repo: path.join(root, 'repository'), work: path.join(root, 'work') };
    const stat = fs.lstatSync(root);
    session.inode = stat.ino; session.device = stat.dev;
    owned.add(session);
    fs.writeFileSync(path.join(root, 'owner.json'), JSON.stringify({ owner: 'framework-benchmark-native-v1', id: session.id }), { mode: 0o600 });
    try {
        materialize(session.repo, entries);
        git(session.repo, ['init', '-q'], runCommand);
        git(session.repo, ['add', '--all', '--force'], runCommand);
        git(session.repo, ['-c', 'user.name=Benchmark', '-c', 'user.email=benchmark@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-qm', 'Frozen benchmark input'], runCommand);
        git(session.repo, ['worktree', 'add', '--detach', session.work, 'HEAD'], runCommand);
        return session;
    } catch (error) {
        try { remove(session, { runCommand }); } catch { /* preserve the original preparation error */ }
        throw error;
    }
}

function assertOwned(session) {
    if (!owned.has(session)) throw new Error('Refusing cleanup of an unowned benchmark worktree');
    const stat = fs.lstatSync(session.root);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.ino !== session.inode || stat.dev !== session.device || fs.realpathSync(session.root) !== session.root) throw new Error('Benchmark cleanup identity changed');
    const marker = JSON.parse(fs.readFileSync(path.join(session.root, 'owner.json'), 'utf8'));
    if (marker.owner !== 'framework-benchmark-native-v1' || marker.id !== session.id) throw new Error('Benchmark cleanup owner changed');
}

function retain(session) {
    assertOwned(session);
    fs.rmSync(path.join(session.root, 'profile'), { recursive: true, force: true });
    session.retained = true;
    return { id: session.id, worktreeRemoved: false, retainedForRecovery: session.work, credentialsRemoved: true };
}

function remove(session, { runCommand = execFileSync } = {}) {
    assertOwned(session);
    if (session.retained) return retain(session);
    const failures = [];
    if (fs.existsSync(path.join(session.repo, '.git'))) {
        try { git(session.repo, ['worktree', 'remove', '--force', '--force', session.work], runCommand); }
        catch (error) { failures.push(`worktree-remove:${error.code || error.status || 'failed'}`); }
    }
    // root identity and process-owned handle were checked above; no parent/sibling is selected.
    fs.rmSync(session.root, { recursive: true, force: true });
    owned.delete(session);
    return { id: session.id, worktreeRemoved: !fs.existsSync(session.work), temporaryRootRemoved: !fs.existsSync(session.root), failures };
}

function cleanup({ preserveUncollected = false } = {}) {
    return [...owned].map(session => { try { return preserveUncollected ? retain(session) : remove(session); } catch (error) { return { id: session.id, error: error.message }; } });
}

module.exports = { gitEnv, git, create, assertOwned, retain, remove, cleanup };
