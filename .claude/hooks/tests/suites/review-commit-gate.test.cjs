'use strict';

// TC-HARNESS-GATE: no agent commit without a review receipt over the exact changeset.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const LIB = path.resolve(__dirname, '../../lib/review-receipt.cjs');
const HOOK = path.resolve(__dirname, '../../review-commit-gate.cjs');
const receipt = () => require(LIB);
const gate = () => require(HOOK);
const NOW = 1800000000000;
const FP_A = 'a'.repeat(64);
const FP_B = 'b'.repeat(64);

function gitAvailable() {
    try {
        const result = spawnSync('git', ['--version'], { encoding: 'utf8', windowsHide: true });
        return result.status === 0;
    } catch (_) {
        return false;
    }
}
const GIT = gitAvailable();

function fixture(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'review-gate-test-'));
    try {
        for (const dir of ['repo-a', 'repo-b', 'store']) fs.mkdirSync(path.join(root, dir));
        return fn({ root, repoA: path.join(root, 'repo-a'), repoB: path.join(root, 'repo-b'), store: path.join(root, 'store') });
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

function git(cwd, args) {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
}

function makeRepo(dir) {
    git(dir, ['init', '-q']);
    git(dir, ['config', 'user.email', 'test@example.com']);
    git(dir, ['config', 'user.name', 'Test']);
    fs.writeFileSync(path.join(dir, 'file.txt'), 'base\n');
    git(dir, ['add', 'file.txt']);
    git(dir, ['commit', '-q', '-m', 'base']);
}

function withStore(store, fn) {
    const before = process.env.CK_REVIEW_RECEIPT_STORE;
    process.env.CK_REVIEW_RECEIPT_STORE = store;
    try {
        return fn();
    } finally {
        if (before === undefined) delete process.env.CK_REVIEW_RECEIPT_STORE;
        else process.env.CK_REVIEW_RECEIPT_STORE = before;
    }
}

const tests = [
    {
        name: 'TC-HARNESS-GATE receipt binds exact fingerprint, repository and kind; skip is separate',
        fn: async () => fixture(fx => {
            const api = receipt();
            api.issueReceipt({ repository: fx.repoA, storeDir: fx.store, fingerprint: FP_A, kind: 'changes-review', now: NOW });
            const check = extra => api.checkReceipt({ repository: fx.repoA, storeDir: fx.store, fingerprint: FP_A, now: NOW, ...extra });
            assert.equal(check({ kind: 'changes-review' }), true);
            assert.equal(check({ kind: 'why-review' }), false, 'kind must be exact');
            assert.equal(check({ kind: 'workflow-review-changes' }), false);
            assert.equal(check({ kind: 'skip' }), false);
            assert.equal(api.matchReviewReceipt({ repository: fx.repoA, storeDir: fx.store, fingerprint: FP_A, now: NOW }), 'changes-review');
            assert.equal(api.matchSkipReceipt({ repository: fx.repoA, storeDir: fx.store, fingerprint: FP_A, now: NOW }), null);
            assert.equal(api.checkReceipt({ repository: fx.repoA, storeDir: fx.store, fingerprint: FP_B, kind: 'changes-review', now: NOW }), false, 'fingerprint must match');
            assert.equal(api.checkReceipt({ repository: fx.repoB, storeDir: fx.store, fingerprint: FP_A, kind: 'changes-review', now: NOW }), false, 'repository must match');

            api.issueReceipt({ repository: fx.repoA, storeDir: fx.store, fingerprint: FP_A, kind: 'skip', now: NOW });
            assert.equal(api.matchSkipReceipt({ repository: fx.repoA, storeDir: fx.store, fingerprint: FP_A, now: NOW }), 'skip');
        })
    },
    {
        name: 'TC-HARNESS-GATE receipt rejects expiry, future issue time, malformed input and over-long lifetime',
        fn: async () => fixture(fx => {
            const api = receipt();
            api.issueReceipt({ repository: fx.repoA, storeDir: fx.store, fingerprint: FP_A, kind: 'changes-review', now: NOW, ttlMs: 1 });
            const at = now => api.checkReceipt({ repository: fx.repoA, storeDir: fx.store, fingerprint: FP_A, kind: 'changes-review', now });
            assert.equal(at(NOW), true);
            assert.equal(at(NOW + 1), false, 'exact expiry boundary');
            assert.equal(at(NOW - 1), false, 'future issue time is not active');

            for (const bad of [
                { kind: 'nope' },
                { fingerprint: 'zz' },
                { ttlMs: 0 },
                { ttlMs: api.MAX_LIFETIME_MS + 1 },
                { repository: 'relative/path' }
            ]) {
                assert.throws(() => api.issueReceipt({ repository: fx.repoA, storeDir: fx.store, fingerprint: FP_A, kind: 'changes-review', now: NOW, ...bad }), JSON.stringify(bad));
            }
        })
    },
    {
        name: 'TC-HARNESS-GATE fingerprint tracks content and is stable across staging',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            assert.equal(api.computeChangeFingerprint(fx.repoA), null, 'clean tree has nothing to review');
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed\n');
            const first = api.computeChangeFingerprint(fx.repoA);
            assert.ok(first && /^[a-f0-9]{64}$/.test(first));
            git(fx.repoA, ['add', 'file.txt']);
            assert.equal(api.computeChangeFingerprint(fx.repoA), first, 'staging must not invalidate a receipt');
            fs.writeFileSync(path.join(fx.repoA, 'new.txt'), 'new\n');
            const withNew = api.computeChangeFingerprint(fx.repoA);
            assert.notEqual(withNew, first, 'a new untracked file must be part of the fingerprint');
            git(fx.repoA, ['add', 'new.txt']);
            assert.equal(api.computeChangeFingerprint(fx.repoA), withNew, 'staging a new file must not invalidate a receipt');
            fs.writeFileSync(path.join(fx.repoA, 'new.txt'), 'newer\n');
            assert.notEqual(api.computeChangeFingerprint(fx.repoA), withNew, 'editing the new file must invalidate it');
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed again\n');
            assert.notEqual(api.computeChangeFingerprint(fx.repoA), first, 'a post-review edit must invalidate it');
        })
    },
    {
        name: 'TC-HARNESS-GATE hook blocks an unreviewed commit and allows reviewed, skip, non-commit and no-change',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed\n');
            withStore(fx.store, () => {
                const commit = () => gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -m "x"', cwd: fx.repoA } });
                assert.equal(commit().code, 2, 'unreviewed commit must block');
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'bash -c "git commit -m x"', cwd: fx.repoA } }).code, 2, 'a wrapped commit must block');
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -F -', cwd: fx.repoA } }).code, 2, 'stdin-message commit must block');
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git status', cwd: fx.repoA } }), undefined, 'non-commit passes');
                assert.equal(gate().evaluate({ tool_name: 'Read', tool_input: { command: 'git commit -m x' } }), undefined, 'non-Bash passes');

                receipt().issueReceipt({ repository: fx.repoA, kind: 'changes-review' });
                assert.equal(commit(), undefined, 'reviewed commit passes');

                fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed after review\n');
                assert.equal(commit().code, 2, 'edit after review re-arms the gate');
                receipt().issueReceipt({ repository: fx.repoA, kind: 'skip', reason: 'user approved skip' });
                assert.equal(commit(), undefined, 'user-approved skip passes');
            });
        })
    },
    {
        name: 'TC-HARNESS-GATE hook lets a no-change commit through',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            withStore(fx.store, () => {
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit --allow-empty -m "x"', cwd: fx.repoA } }), undefined);
            });
        })
    },
    {
        name: 'TC-HARNESS-GATE a compound commit requires a receipt for EVERY target repository',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            makeRepo(fx.repoB);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'a-change\n');
            fs.writeFileSync(path.join(fx.repoB, 'file.txt'), 'b-change\n');
            withStore(fx.store, () => {
                const compound = `git -C "${fx.repoA}" commit -m a && git -C "${fx.repoB}" commit -m b`;
                const run = () => gate().evaluate({ tool_name: 'Bash', tool_input: { command: compound, cwd: fx.repoA } });
                assert.equal(run().code, 2, 'no receipts must block');
                receipt().issueReceipt({ repository: fx.repoA, kind: 'changes-review' });
                assert.equal(run().code, 2, 'a receipt for only the first repository must still block');
                receipt().issueReceipt({ repository: fx.repoB, kind: 'changes-review' });
                assert.equal(run(), undefined, 'receipts for both repositories pass');
            });
        })
    },
    {
        name: 'TC-HARNESS-GATE CLI issues, checks, skips and clears against an isolated store',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed\n');
            const call = (args) => spawnSync(process.execPath, [LIB, ...args], {
                cwd: fx.repoA,
                encoding: 'utf8',
                windowsHide: true,
                env: { ...process.env, CK_REVIEW_RECEIPT_STORE: fx.store }
            });
            const issued = call(['issue', '--kind=changes-review']);
            assert.equal(issued.status, 0, issued.stderr);
            assert.match(JSON.parse(issued.stdout).fingerprint, /^[a-f0-9]{64}$/);

            const checked = call(['check']);
            assert.equal(checked.status, 0, checked.stderr);
            const state = JSON.parse(checked.stdout);
            assert.equal(state.review, 'changes-review');
            assert.equal(state.skip, null);

            assert.equal(call(['skip', '--reason=user approved skip']).status, 0);
            assert.equal(JSON.parse(call(['check']).stdout).skip, 'skip');

            assert.equal(call(['clear']).status, 0);
            const cleared = JSON.parse(call(['check']).stdout);
            assert.equal(cleared.review, null);
            assert.equal(cleared.skip, null);
        })
    }
];

module.exports = { name: 'review-commit-gate', tests };
