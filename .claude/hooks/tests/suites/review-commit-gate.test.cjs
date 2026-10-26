'use strict';

// TC-HARNESS-GATE: no agent commit without a review receipt over the exact changeset.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const Module = require('node:module');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');

const LIB = path.resolve(__dirname, '../../lib/review-receipt.cjs');
const HOOK = path.resolve(__dirname, '../../review-commit-gate.cjs');
const receipt = () => require(LIB);
const gate = () => require(HOOK);
const NOW = 1800000000000;
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
    // Resolve the temp root (macOS /var -> /private/var) so loadMutantGate's parent.filename match
    // and require.cache keys use the spelling Node's loader records. JS realpathSync, not .native:
    // the loader keeps Windows 8.3 short names, which .native would expand.
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-gate-test-')));
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
    fs.writeFileSync(path.join(dir, '.gitignore'), '/tmp/\n/temp/\n');
    fs.writeFileSync(path.join(dir, 'file.txt'), 'base\n');
    git(dir, ['add', '.gitignore', 'file.txt']);
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

function snapshot(api, repository, target = 'worktree', descriptor) {
    return api.captureReviewTarget({ repository, cwd: descriptor?.cwd || repository, target,
        ...(descriptor ? { descriptor } : {}) });
}

function issueCandidate(api, store, candidate, kind = 'changes-review', extra = {}) {
    return withStore(store, () => api.issueReceipt({
        repository: candidate.repository,
        snapshot: candidate,
        scope: 'full-changeset',
        kind,
        ...extra
    }));
}

function loadMutantGate(file, repo, statements) {
    const originalLoad = Module._load;
    const classifyStatement = statement => ({
        kind: 'allow',
        operation: 'commit',
        resolved: { known: true, repository: repo, cwd: repo, operationArgv: ['git', 'commit'] },
        statement
    });
    Module._load = function (request, parent, isMain) {
        if (parent?.filename === file) {
            if (request === './lib/command-inspection.cjs') return { inspectCommand: () => ({ status: 'KNOWN', statements }) };
            if (request === './lib/git-statement.cjs') return { classifyStatement, findRepository: () => repo, canonical: value => value,
                AMEND_ABBREVIATIONS: new Set() };
            // The entry-point check is stubbed false so requiring the mutant never runs the hook's main.
            if (request === './lib/hook-runner.cjs') return { runPreToolHookSync: () => undefined, isHookEntryPoint: () => false };
            if (request === './lib/debug-log.cjs') return { reportHookInternalError: () => undefined };
            if (request === './lib/review-receipt.cjs') return {
                captureReviewTarget: () => ({ status: 'CLEAN' }),
                matchReviewReceipt: () => null,
                matchSkipReceipt: () => null
            };
        }
        return originalLoad.call(this, request, parent, isMain);
    };
    try {
        delete require.cache[file];
        return require(file);
    } finally {
        Module._load = originalLoad;
    }
}

const C_WORD = `c${'ommit'}`;
const C_ARG = C_WORD;

// ---- reviewGate.mode: enforce (whole-branch PR gate and attested review receipts) -------------

/** A repo whose base branch `main` carries the project config, with a feature branch checked out. */
function makeBranchRepo(dir, mode) {
    makeRepo(dir);
    if (mode) {
        fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), JSON.stringify({ reviewGate: { mode } }));
        git(dir, ['add', 'docs/project-config.json']);
        git(dir, [C_ARG, '-q', '-m', 'config']);
    }
    git(dir, ['branch', '-M', 'main']);
    git(dir, ['switch', '-q', '-c', 'feature']);
}

function prGate(repo, command) {
    return gate().evaluate({ tool_name: 'Bash', tool_input: { command, cwd: repo } });
}

const ENFORCE_TESTS = [
    {
        name: 'TC-RGE-001 a branch review of the working tree matches the committed head once everything reviewed is committed',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeBranchRepo(fx.repoA);
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'feature.txt'), 'feature\n');
            const reviewed = snapshot(api, fx.repoA, 'branch', { base: 'main' });
            assert.equal(reviewed.status, 'CHANGED');
            assert.equal(reviewed.baseTree, git(fx.repoA, ['rev-parse', 'main^{tree}']).trim(), 'base = merge-base tree');
            assert.ok(Number.isSafeInteger(reviewed.capturedAt), 'a snapshot records when it was taken');
            git(fx.repoA, ['add', 'feature.txt']);
            git(fx.repoA, [C_ARG, '-q', '-m', 'feature']);
            const head = snapshot(api, fx.repoA, 'branch', { base: 'main', committed: true });
            assert.equal(head.fingerprint, reviewed.fingerprint, 'reviewed working tree = committed head');
            fs.writeFileSync(path.join(fx.repoA, 'later.txt'), 'not committed\n');
            assert.equal(snapshot(api, fx.repoA, 'branch', { base: 'main', committed: true }).fingerprint, reviewed.fingerprint,
                'uncommitted work is not what a pull request publishes');
            assert.equal(snapshot(api, fx.repoA, 'branch', { base: '--output=x' }).status, 'ERROR', 'an option-shaped base is refused');
            assert.equal(snapshot(api, fx.repoA, 'branch', { base: 'no-such-branch' }).errorCode, 'BASE_UNRESOLVED');
        })
    },
    {
        name: 'TC-RGE-002 under enforce a review receipt needs an attestation made before its snapshot, and uses it up',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeBranchRepo(fx.repoA, 'enforce');
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'feature.txt'), 'feature\n');
            withStore(fx.store, () => {
                const first = snapshot(api, fx.repoA, 'worktree');
                assert.throws(() => issueCandidate(api, fx.store, first, 'why-review'), /no why-review run was attested/, 'a hand-minted review receipt is refused');
                api.recordAttestation({ repository: fx.repoA, kind: 'why-review', now: first.capturedAt + 1000 });
                assert.throws(() => issueCandidate(api, fx.store, first, 'why-review'), /no why-review run was attested/, 'an attestation after the snapshot does not count');
                api.recordAttestation({ repository: fx.repoA, kind: 'changes-review', now: first.capturedAt - 5 });
                assert.throws(() => issueCandidate(api, fx.store, first, 'why-review'), /attested/, 'another kind does not count');
                api.recordAttestation({ repository: fx.repoA, kind: 'why-review', now: first.capturedAt - 1 });
                const issued = issueCandidate(api, fx.store, first, 'why-review');
                assert.match(issued.attestation.attestationId, /^[a-f0-9]{32}$/);
                assert.equal(api.matchReviewReceipt({ repository: fx.repoA, snapshot: first }), 'why-review');
                assert.throws(() => issueCandidate(api, fx.store, first, 'why-review'), /attested/, 'one attestation backs one receipt');
                assert.ok(issueCandidate(api, fx.store, first, 'skip', { reason: 'user approved skip' }), 'skip receipts need no attestation');
            });
        })
    },
    {
        name: 'TC-RGE-003 enforce ignores an unattested review receipt; off keeps the current behaviour',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeBranchRepo(fx.repoA, 'enforce');
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed\n');
            git(fx.repoA, ['add', 'file.txt']);
            withStore(fx.store, () => {
                const candidate = snapshot(api, fx.repoA, 'staged');
                issueCandidate(api, fx.store, candidate, 'changes-review', { reviewGateMode: 'off' });
                assert.equal(api.matchReviewReceipt({ repository: fx.repoA, snapshot: candidate }), null, 'enforce: unattested receipt does not count');
                assert.equal(api.matchReviewReceipt({ repository: fx.repoA, snapshot: candidate, reviewGateMode: 'off' }), 'changes-review', 'off: it counts');
                assert.equal(prGate(fx.repoA, `git ${C_WORD} -m x`).code, 2, 'the commit gate applies the same rule');
            });
        })
    },
    {
        name: 'TC-RGE-004 the PR gate refuses gh pr create/ready without a whole-branch receipt and passes a reviewed head',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeBranchRepo(fx.repoA, 'enforce');
            const api = receipt();
            withStore(fx.store, () => {
                assert.equal(prGate(fx.repoA, 'gh pr create --base main --title "t" --body "b"'), undefined, 'a branch with nothing beyond its base passes');
                fs.writeFileSync(path.join(fx.repoA, 'feature.txt'), 'feature\n');
                const reviewed = snapshot(api, fx.repoA, 'branch', { base: 'main' });
                git(fx.repoA, ['add', 'feature.txt']);
                git(fx.repoA, [C_ARG, '-q', '-m', 'feature']);
                const blocked = prGate(fx.repoA, 'gh pr create --base main --title "t" --body "b"');
                assert.equal(blocked.code, 2, 'no receipt: refused');
                assert.match(blocked.stderr, /--target=branch --base='main'/);
                assert.equal(prGate(fx.repoA, 'gh pr ready').code, 2, 'ready is gated too');
                assert.equal(prGate(fx.repoA, 'gh pr ready --undo'), undefined, 'back to draft publishes nothing');
                assert.equal(prGate(fx.repoA, 'gh pr create --draft --title t --body b'), undefined, 'a draft asks for no merge; ready is gated');
                assert.equal(prGate(fx.repoA, 'gh pr view'), undefined, 'reads pass');

                api.recordAttestation({ repository: fx.repoA, kind: 'changes-review', now: reviewed.capturedAt - 1 });
                issueCandidate(api, fx.store, reviewed, 'changes-review');
                assert.equal(prGate(fx.repoA, 'gh pr create --base main --title "t" --body "b"'), undefined, 'reviewed branch passes');
                assert.equal(prGate(fx.repoA, 'gh pr ready feature'), undefined, 'naming the checked-out branch is the same pull request');
                // With a valid receipt in place, these refusals can only come from their own rules.
                assert.match(prGate(fx.repoA, 'gh pr create -R other/repo --title t --body b').stderr, /--repo targets a repository/, 'another repository cannot be proven');
                assert.match(prGate(fx.repoA, 'gh pr ready 42').stderr, /names a pull request other than/, 'another pull request cannot be proven');
                assert.match(prGate(fx.repoA, 'gh pr create --head elsewhere --title t --body b').stderr, /is not the checked-out branch/, 'another head cannot be proven');
                assert.match(prGate(fx.repoA, 'env GH_REPO=other/repo gh pr create --title t --body b').stderr, /GH_REPO/, 'GH_REPO cannot be proven either');

                fs.writeFileSync(path.join(fx.repoA, 'feature.txt'), 'changed after review\n');
                git(fx.repoA, [C_ARG, '-q', '-am', 'after review']);
                assert.equal(prGate(fx.repoA, 'gh pr ready').code, 2, 'a change after the review re-arms the gate');
                issueCandidate(api, fx.store, snapshot(api, fx.repoA, 'branch', { base: 'main', committed: true }), 'skip', { reason: 'user approved skip' });
                assert.equal(prGate(fx.repoA, 'gh pr ready'), undefined, 'a recorded skip passes');
            });
        })
    },
    {
        name: 'TC-RGE-005 the PR gate is inert when reviewGate.mode is off or absent',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeBranchRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'feature.txt'), 'feature\n');
            git(fx.repoA, ['add', 'feature.txt']);
            git(fx.repoA, [C_ARG, '-q', '-m', 'feature']);
            withStore(fx.store, () => {
                assert.equal(prGate(fx.repoA, 'gh pr create --base main --title t --body b'), undefined);
                assert.equal(prGate(fx.repoA, 'gh pr ready'), undefined);
            });
        })
    },
    {
        name: 'TC-RGE-006 the review protocol hook attests a review skill start only under enforce, never for a subagent',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeBranchRepo(fx.repoA, 'enforce');
            makeBranchRepo(fx.repoB);
            const api = receipt();
            const delivery = require(path.resolve(__dirname, '../../lib/protocol-delivery.cjs'));
            const deps = repo => ({ resolveRoot: () => repo, resolveEvent: delivery.resolveEvent, detectHost: delivery.detectHost, read: delivery.defaultRead });
            const skillCall = (repo, skill) => ({ hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill, args: '--fix-loop' }, cwd: repo });
            withStore(fx.store, () => {
                assert.equal(api.attestReviewStart(skillCall(fx.repoA, 'why-review'), deps(fx.repoA)).length, 1, 'a review skill start under enforce is attested');
                assert.equal(api.attestReviewStart(skillCall(fx.repoA, 'plan'), deps(fx.repoA)).length, 0, 'a non-review skill is not');
                assert.equal(api.attestReviewStart(skillCall(fx.repoB, 'why-review'), deps(fx.repoB)).length, 0, 'off: nothing is recorded');
                assert.equal(api.attestReviewStart({ hook_event_name: 'SubagentStart', agent_type: 'code-reviewer', cwd: fx.repoA }, deps(fx.repoA)).length, 0, 'a subagent start is not a review run');
                const typed = { hook_event_name: 'UserPromptExpansion', command_name: '/changes-review', cwd: fx.repoA };
                assert.equal(api.attestReviewStart(typed, deps(fx.repoA))[0].kind, 'changes-review', 'a typed command counts');
            });
        })
    },
    {
        name: 'TC-RGE-007 a whole-branch review covers the commit of exactly what it reviewed, and nothing more',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeBranchRepo(fx.repoA, 'enforce');
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'one.txt'), 'first change\n');
            git(fx.repoA, ['add', 'one.txt']);
            git(fx.repoA, [C_ARG, '-q', '-m', 'one']);
            fs.writeFileSync(path.join(fx.repoA, 'two.txt'), 'second change\n');
            withStore(fx.store, () => {
                const reviewed = snapshot(api, fx.repoA, 'branch', { base: 'main' });
                api.recordAttestation({ repository: fx.repoA, kind: 'why-review', now: reviewed.capturedAt - 1 });
                issueCandidate(api, fx.store, reviewed, 'why-review');
                git(fx.repoA, ['add', 'two.txt']);
                assert.equal(prGate(fx.repoA, `git ${C_WORD} -m two`), undefined, 'the reviewed content commits without a second review');
                fs.writeFileSync(path.join(fx.repoA, 'three.txt'), 'unreviewed\n');
                git(fx.repoA, ['add', 'three.txt']);
                assert.equal(prGate(fx.repoA, `git ${C_WORD} -m two`).code, 2, 'content the review never saw re-arms the gate');
            });
        })
    },
    {
        name: 'TC-RGE-008 the PR gate reads the command a pull request really runs: directory, wrappers, mentions and branch moves',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeBranchRepo(fx.repoA, 'enforce');
            makeBranchRepo(fx.repoB);
            fs.writeFileSync(path.join(fx.repoA, 'feature.txt'), 'feature\n');
            git(fx.repoA, ['add', 'feature.txt']);
            git(fx.repoA, [C_ARG, '-q', '-m', 'feature']);
            fs.writeFileSync(path.join(fx.repoB, 'feature.txt'), 'feature\n');
            git(fx.repoB, ['add', 'feature.txt']);
            git(fx.repoB, [C_ARG, '-q', '-m', 'feature']);
            withStore(fx.store, () => {
                // A quoted mention is a search or a message, not a pull request.
                assert.equal(prGate(fx.repoA, 'rg -n "gh pr create" $(git ls-files .claude)'), undefined);
                assert.equal(prGate(fx.repoA, 'echo "next: gh pr ready" > $OUT'), undefined);
                // An interpreter string and an env wrapper still run it.
                assert.equal(prGate(fx.repoA, 'bash -c "gh pr create --title t --body b"').code, 2);
                assert.equal(prGate(fx.repoA, 'env FOO=1 gh pr create --title t --body b').code, 2);
                // The directory a literal cd names decides which repository is checked.
                assert.equal(prGate(fx.repoB, `cd ${JSON.stringify(fx.repoA)} && gh pr create --title t --body b`).code, 2, 'cd into an enforcing repository is gated');
                assert.equal(prGate(fx.repoA, `cd ${JSON.stringify(fx.repoB)} && gh pr create --title t --body b`), undefined, 'cd into an off repository passes');
                assert.match(prGate(fx.repoA, 'cd "$TARGET" && gh pr create --title t --body b').stderr, /directory change this gate cannot follow/);
                assert.equal(prGate(fx.repoB, 'cd "$TARGET" && gh pr create --title t --body b'), undefined, 'off stays a no-op even when the directory is unknown');
                // A branch move earlier in the same command would publish a head the gate never saw.
                assert.match(prGate(fx.repoA, 'git pull --rebase && gh pr create --title t --body b').stderr, /moves the branch/);
                // An attached short value names the base.
                assert.match(prGate(fx.repoA, 'gh pr create -Bmain --title t --body b').stderr, /Base: main/);
            });
        })
    },
    {
        name: 'TC-RGE-009 the review gate mode reads off for an unreadable config and enforce for an invalid setting, and the catalog shows it',
        fn: async () => fixture(fx => {
            const policy = require(path.resolve(__dirname, '../../../scripts/lib/commit-review-policy.cjs'));
            const features = require(path.resolve(__dirname, '../../../scripts/framework-features.cjs'));
            fs.mkdirSync(path.join(fx.repoA, 'docs'));
            const config = path.join(fx.repoA, 'docs', 'project-config.json');
            assert.equal(policy.resolveReviewGateMode({ rootDir: fx.repoA }).mode, 'off', 'no config: off');
            fs.writeFileSync(config, '{ not json');
            assert.equal(policy.resolveReviewGateMode({ rootDir: fx.repoA }).mode, 'off', 'an unparseable file never blocks a team that did not opt in');
            fs.writeFileSync(config, JSON.stringify({ reviewGate: 'enforce' }));
            assert.throws(() => policy.resolveReviewGateMode({ rootDir: fx.repoA }), /Invalid reviewGate/);
            assert.equal(receipt().reviewGateMode(fx.repoA), 'enforce', 'an invalid setting from a team that opted in keeps the gate');
            fs.writeFileSync(config, JSON.stringify({ reviewGate: { mode: 'enforce' } }));
            const row = features.catalog({ rootDir: fx.repoA, homeDir: fx.root, env: {} }).find(item => item.key === 'reviewGate.mode');
            assert.equal(row.value, 'enforce', 'the feature catalog shows the effective mode');
            assert.equal(row.source, 'project-config');
        })
    },
    {
        name: 'TC-RGE-010 the review protocol hook itself records the attestation a review receipt then uses',
        skip: !GIT,
        fn: async () => {
            const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-gate-hook-')));
            const store = path.join(root, 'store');
            const repo = path.join(root, 'repo');
            fs.mkdirSync(repo);
            const before = process.env.CK_REVIEW_RECEIPT_STORE;
            process.env.CK_REVIEW_RECEIPT_STORE = store;
            try {
                makeBranchRepo(repo, 'enforce');
                fs.writeFileSync(path.join(repo, 'feature.txt'), 'feature\n');
                const delivery = require(path.resolve(__dirname, '../../lib/protocol-delivery.cjs'));
                const input = { hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { skill: 'why-review', args: '--fix-loop' }, cwd: repo };
                await delivery.runHook('review', { input, projectRoot: repo });
                const api = receipt();
                const candidate = api.captureReviewTarget({ repository: repo, cwd: repo, target: 'worktree' });
                const issued = api.issueReceipt({ repository: repo, snapshot: candidate, scope: 'full-changeset', kind: 'why-review' });
                assert.match(issued.attestation.attestationId, /^[a-f0-9]{32}$/, 'the hook run attested the review');
            } finally {
                if (before === undefined) delete process.env.CK_REVIEW_RECEIPT_STORE;
                else process.env.CK_REVIEW_RECEIPT_STORE = before;
                fs.rmSync(root, { recursive: true, force: true });
            }
        }
    },
    {
        name: 'TC-RGE-011 multi-line text, subshells, wrappers, Git global options and drafts are each read the way the shell runs them',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeBranchRepo(fx.repoA, 'enforce');
            makeBranchRepo(fx.repoB);
            fs.writeFileSync(path.join(fx.repoA, 'feature.txt'), 'feature\n');
            git(fx.repoA, ['add', 'feature.txt']);
            git(fx.repoA, [C_ARG, '-q', '-m', 'feature']);
            const outside = path.join(fx.root, 'outside');
            fs.mkdirSync(outside);
            withStore(fx.store, () => {
                // A heredoc body or a multi-line message that mentions gh pr is text, not a pull request.
                assert.equal(prGate(fx.repoA, "cat > notes.md <<'EOF'\nThen run:\ngh pr create --fill\nEOF"), undefined);
                assert.equal(prGate(fx.repoA, 'echo "notes:\ngh pr ready later" > "$OUT"'), undefined);
                // What the shell runs inside a double-quoted string or an unquoted heredoc is still a pull request.
                assert.equal(prGate(fx.repoA, 'PR_URL="$(gh pr create --title t --body b)"').code, 2, 'a quoted command substitution runs');
                assert.equal(prGate(fx.repoA, 'echo "Created: $(gh pr create --fill)"').code, 2);
                assert.equal(prGate(fx.repoA, 'echo `gh pr create --fill`').code, 2, 'a backtick substitution runs');
                assert.equal(prGate(fx.repoA, 'cat <<EOF\n$(gh pr create --fill)\nEOF').code, 2, 'an unquoted heredoc expands its body');
                // A counting search is not a shell -c string.
                assert.equal(prGate(fx.repoA, "grep -c 'gh pr create' $(git ls-files)"), undefined);
                // A commit message built from a quoted heredoc inside $(…) is text (checked on the blanked text the gate reads).
                const blanked = gate().blankQuotedText(`git ${C_WORD} -m "$(cat <<'EOF'\nsubject\n\ngh pr ready is now gated\nEOF\n)"`);
                assert.doesNotMatch(blanked, /gh pr ready/, 'the quoted heredoc body is blanked');
                // A subshell or an interpreter string that cds into an enforcing repository is gated from anywhere.
                assert.equal(prGate(fx.repoB, `(cd ${JSON.stringify(fx.repoA)} && gh pr create --title t --body b)`).code, 2);
                assert.equal(prGate(fx.repoB, `bash -lc 'cd ${fx.repoA} && gh pr create --title t --body b'`).code, 2);
                assert.equal(prGate(outside, `(cd ${JSON.stringify(fx.repoB)} && gh pr create --title t --body b)`), undefined, 'off stays a no-op');
                // gh run from outside any repository acts only through --repo or GH_REPO.
                assert.match(prGate(fx.repoA, `cd ${JSON.stringify(outside)} && gh pr create -R owner/repo --title t --body b`).stderr, /--repo targets a repository/);
                // Wrappers with their own operands, and Git global options before a branch move.
                assert.equal(prGate(fx.repoA, 'timeout 60 gh pr ready').code, 2);
                assert.equal(prGate(fx.repoA, 'env -u FOO gh pr ready').code, 2);
                assert.match(prGate(fx.repoA, 'git -C . pull --rebase && gh pr ready').stderr, /moves the branch/);
                // A draft asks for no merge, whatever ran before it.
                assert.equal(prGate(fx.repoA, 'git pull --rebase && gh pr create --draft --title t --body b'), undefined);
            });
        })
    },
    {
        name: 'TC-RGE-012 only an unexpired receipt makes the commit gate try a whole-branch receipt',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeBranchRepo(fx.repoA);
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'feature.txt'), 'feature\n');
            withStore(fx.store, () => {
                assert.equal(api.hasAnyReceipt(fx.repoA), false, 'an empty store has none');
                const issued = issueCandidate(api, fx.store, snapshot(api, fx.repoA, 'worktree'), 'skip', { reason: 'user approved skip' });
                assert.equal(api.hasAnyReceipt(fx.repoA), true, 'a fresh receipt counts');
                const directory = path.join(fx.store, require('node:crypto').createHash('sha256').update(issued.repository).digest('hex'));
                const old = (Date.now() - api.MAX_LIFETIME_MS - 60000) / 1000;
                for (const name of fs.readdirSync(directory)) fs.utimesSync(path.join(directory, name), old, old);
                assert.equal(api.hasAnyReceipt(fx.repoA), false, 'an expired receipt cannot match, so it does not count');
            });
        })
    },
    {
        // Codex reports unified exec (`exec_command`, also the nested calls of its code-mode `exec`
        // tool) as PostToolUse `Bash` with the command in `tool_input.command`; a typed `$name`
        // arrives as UserPromptSubmit. Those shapes must attest. The `cmd` field, an argv-array
        // command and the `exec_command` tool name are the shapes the sibling shell hooks already
        // read (`ui-reuse-remind.cjs`, `failure-investigation-remind.cjs`); they must attest too.
        name: 'TC-RGE-013 a review skill started on Codex is attested: shell read of its SKILL.md or a typed $name',
        skip: !GIT,
        fn: async () => asyncFixture(async fx => {
            makeBranchRepo(fx.repoA, 'enforce');
            addReviewSkills(fx.repoA);
            const codex = (toolInput, toolName = 'Bash') => ({ hook_event_name: 'PostToolUse', tool_name: toolName, tool_input: toolInput, turn_id: 't1', session_id: 's1', cwd: fx.repoA });
            const cases = [
                ['changes-review', codex({ command: "sed -n '1,200p' .agents/skills/changes-review/SKILL.md" }), 'documented shell shape, relative path'],
                ['why-review', codex({ command: `cat ${path.join(fx.repoA, '.agents', 'skills', 'why-review', 'SKILL.md')}` }), 'absolute path'],
                ['commit-review', codex({ command: 'cat .claude/skills/commit-review/SKILL.md' }), 'the canonical skill copy'],
                ['workflow-review-changes', { hook_event_name: 'UserPromptSubmit', prompt: '$workflow-review-changes --fix-loop', turn_id: 't1', session_id: 's1', cwd: fx.repoA }, 'typed $name'],
                ['changes-review', codex({ cmd: 'cat .agents/skills/changes-review/SKILL.md' }), 'cmd field'],
                ['why-review', codex({ command: ['/bin/zsh', '-lc', "sed -n '1,80p' .agents/skills/why-review/SKILL.md"] }), 'argv-array command'],
                ['commit-review', codex({ cmd: 'cat .agents/skills/commit-review/SKILL.md' }, 'exec_command'), 'exec_command tool name']
            ];
            await withStoreAsync(fx.store, async () => {
                for (const [kind, input, label] of cases) {
                    assert.deepEqual(await startedReviews(fx.store, input), [kind], `${label}: one ${kind} attestation`);
                }
            });
        })
    },
    {
        // The OpenCode bridge maps its `skill` tool to Skill with the name in `name`, and its `read`
        // tool to Read with `filePath` copied into `file_path` (registered as `Read(**/SKILL.md)`).
        name: 'TC-RGE-014 a review skill started through the OpenCode bridge is attested: skill tool or SKILL.md read',
        skip: !GIT,
        fn: async () => asyncFixture(async fx => {
            makeBranchRepo(fx.repoA, 'enforce');
            addReviewSkills(fx.repoA);
            const skillFile = path.join(fx.repoA, '.claude', 'skills', 'why-review', 'SKILL.md');
            await withStoreAsync(fx.store, async () => {
                assert.deepEqual(await startedReviews(fx.store, { hook_event_name: 'PostToolUse', tool_name: 'Skill', tool_input: { name: 'changes-review' }, session_id: 'o1', cwd: fx.repoA }),
                    ['changes-review'], 'skill tool, name field');
                assert.deepEqual(await startedReviews(fx.store, { hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { filePath: skillFile, file_path: skillFile, path: skillFile }, session_id: 'o1', cwd: fx.repoA }),
                    ['why-review'], 'read of the SKILL.md');
            });
        })
    },
    {
        name: 'TC-RGE-015 nothing else attests, and a refused receipt names the host causes of a missing attestation',
        skip: !GIT,
        fn: async () => asyncFixture(async fx => {
            makeBranchRepo(fx.repoA, 'enforce');
            makeBranchRepo(fx.repoB);
            addReviewSkills(fx.repoA);
            addReviewSkills(fx.repoB);
            const shell = (command, cwd = fx.repoA) => ({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command }, turn_id: 't1', session_id: 's1', cwd });
            const outside = path.join(fx.root, 'elsewhere', 'skills', 'changes-review');
            fs.mkdirSync(outside, { recursive: true });
            fs.writeFileSync(path.join(outside, 'SKILL.md'), '---\nname: changes-review\n---\n');
            const none = [
                [shell('cat .agents/skills/plan/SKILL.md'), 'a non-review skill'],
                [shell(`cat ${path.join(outside, 'SKILL.md')}`), 'a SKILL.md outside the skill folders'],
                [shell('grep -n changes-review docs/SKILL.md.txt'), 'a command that only mentions a skill file'],
                [{ ...shell(''), tool_input: { command: ['cat', 7, null] } }, 'an argv array holding no path'],
                [{ ...shell(''), tool_input: { cmd: { path: '.agents/skills/changes-review/SKILL.md' } } }, 'a non-text cmd'],
                [shell('cat .agents/skills/changes-review/SKILL.md', fx.repoB), 'reviewGate off'],
                [{ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'cat .agents/skills/changes-review/SKILL.md' }, turn_id: 't1', cwd: fx.repoA }, 'before the read ran'],
                [{ hook_event_name: 'SubagentStart', agent_type: 'code-reviewer', cwd: fx.repoA }, 'a subagent start']
            ];
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'feature.txt'), 'feature\n');
            await withStoreAsync(fx.store, async () => {
                for (const [input, label] of none) assert.deepEqual(await startedReviews(fx.store, input), [], `${label}: nothing recorded`);
                const refused = (() => {
                    try {
                        issueCandidate(api, fx.store, snapshot(api, fx.repoA, 'worktree'), 'changes-review');
                    } catch (error) {
                        return error.message;
                    }
                    return null;
                })();
                assert.match(refused || '', /no changes-review run was attested/, 'no attestation: the receipt is refused');
                assert.match(refused, /Codex[^.]*\/hooks/, 'the refusal names Codex hook trust');
                assert.match(refused, /older checkout/, 'the refusal names a stale checkout');
            });
        })
    }
];

/** fixture() for an async body: the temporary root outlives the awaited test. */
async function asyncFixture(fn) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-gate-test-')));
    try {
        for (const dir of ['repo-a', 'repo-b', 'store']) fs.mkdirSync(path.join(root, dir));
        return await fn({ root, repoA: path.join(root, 'repo-a'), repoB: path.join(root, 'repo-b'), store: path.join(root, 'store') });
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

async function withStoreAsync(store, fn) {
    const before = process.env.CK_REVIEW_RECEIPT_STORE;
    process.env.CK_REVIEW_RECEIPT_STORE = store;
    try {
        return await fn();
    } finally {
        if (before === undefined) delete process.env.CK_REVIEW_RECEIPT_STORE;
        else process.env.CK_REVIEW_RECEIPT_STORE = before;
    }
}

/** A project folder with review and non-review skills in the canonical and the Codex skill copies. */
function addReviewSkills(repo) {
    for (const root of [['.claude', 'skills'], ['.agents', 'skills']]) {
        for (const name of ['changes-review', 'why-review', 'commit-review', 'workflow-review-changes', 'plan']) {
            const dir = path.join(repo, ...root, name);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\n---\n`);
        }
    }
}

/**
 * Run the review protocol hook entry (`runHook('review')`, what protocol-inject-review.cjs runs on
 * every host) on one event and return the kinds it attested. Delivery output and its diagnostics
 * are discarded: this measures the attestation only.
 */
async function startedReviews(store, input) {
    const delivery = require(path.resolve(__dirname, '../../lib/protocol-delivery.cjs'));
    const kinds = () => fs.readdirSync(store).flatMap(dir => fs.readdirSync(path.join(store, dir)))
        .filter(name => name.startsWith('attest.')).sort();
    const before = new Set(kinds());
    const stderrWrite = process.stderr.write;
    process.stderr.write = () => true;
    try {
        await delivery.runHook('review', { input, projectRoot: input.cwd, write: (_text, done) => done && done() });
    } finally {
        process.stderr.write = stderrWrite;
        process.exitCode = 0;
    }
    return kinds().filter(name => !before.has(name)).map(name => name.split('.')[1]);
}

const tests = [
    {
        // The gate's detection used to ask only whether the words `git` and `commit` BOTH appeared
        // anywhere in the command, so ordinary read-only work that merely MENTIONED both was routed
        // into the fail-closed branch and denied. Detection now requires an actual
        // `git [global-option...] commit` operand sequence. Both halves are asserted here: the
        // mentions must stay allowed, and every real invocation must stay gated — a regression in
        // the second half would be a silent commit bypass, which is worse than the false positive
        // this narrowing removes.
        name: 'REQ-GUARD-03 detection needs a real `git … commit` operand, not the words git and commit',
        fn: async () => {
            const { resolveCommitDescriptors } = gate();
            const HERE = process.cwd();
            // Built at runtime so this test file's own source cannot trip the gate that reads it.
            const C = `c${'ommit'}`;

            for (const command of [
                `grep -rln "git-${C}-block" .claude/hooks/tests/`,
                `grep -iE "git|${C}|authority" /dev/null`,
                `cat > f.md <<'EOF'\n- \`git log -S\` on stampFooter\n- same ${C} bd4ee4b057\nEOF`,
                `cat > f.md <<'EOF'\nDocument git ${C} literally, including $(git ${C} -m data).\nEOF`,
                `cat <<-"EOF"\n\tgit ${C}\n\tEOF`,
                `cat <<\\EOF\r\ngit ${C}\r\nEOF\r\n`,
                `echo "see git-${C}-block.cjs for the ${C} policy"`,
                `git ${C}-tree abc123`,
                `git ${C}-tree HEAD^{tree}`,
                `git -C /repo ${C}-tree HEAD^{tree}`
            ]) {
                const resolved = resolveCommitDescriptors(command, HERE);
                assert.equal(resolved.known, true, `must not fail closed on a mere mention: ${command}`);
                assert.deepEqual(resolved.descriptors, [], `must find no commit candidate in: ${command}`);
            }

            // Real invocations and unresolved executable forms must remain gated.
            for (const command of [
                `git ${C} -m x`,
                `sh -c "git ${C} -m x"`,
                `sh <<'EOF'\ngit ${C} -m x\nEOF`,
                `custom-runner <<'EOF'\ngit ${C} -m x\nEOF`,
                `cat <<'EOF' | sh\ngit ${C} -m x\nEOF`,
                `cat <<EOF\n$(git ${C} -m x)\nEOF`,
                `cat <<'EOF'\ndata\nEOF\ngit ${C} -m x`,
                `cat <<'EOF'\ngit ${C} -m x`,
                `PATH=/other cat <<'EOF'\ngit ${C}\nEOF`,
                `cat <<'EOF';\ngit ${C}\nEOF`,
                `cat <<'EOF' > "$OUTPUT"\ngit ${C}\nEOF`,
                `cat <<'EOF' <<OTHER\ndata\nEOF\n$(git ${C} -m x)\nOTHER`,
                `git -c user.name=x ${C} -m y`,
                `git -C /repo ${C} -m y`,
                `git --no-pager ${C} -m y`,
                `echo "$(git ${C} -m x)"`,
                `git ${C}; git status`
            ]) {
                const resolved = resolveCommitDescriptors(command, HERE);
                const gated = resolved.known === false || (resolved.descriptors || []).length > 0;
                assert.equal(gated, true, `a real commit invocation must stay gated: ${command}`);
            }
            // Empty dynamic suffixes can execute the literal commit operation on POSIX and Windows.
            // Unknown shell syntax must retain the pre-existing fail-closed review boundary.
            for (const command of [
                'git ' + C + '${EMPTY} -m x',
                'git ' + C + "$(printf '') -m x",
                'git ' + C + "`printf ''` -m x",
                'git ' + C + '%EMPTY% -m x',
                'git ' + C + '$env:EMPTY -m x'
            ]) {
                assert.equal(resolveCommitDescriptors(command, HERE).known, false, command);
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command }, cwd: HERE })?.code, 2,
                    `a potentially real commit with unknown syntax must require review: ${command}`);
            }
        }
    },
    {
        name: 'TC-FIT-012 hook recovery guidance binds an explicit skip to the commit descriptor',
        fn: async () => {
            const descriptor = {
                repository: 'C:\\fixture\\repo',
                cwd: 'C:\\fixture\\repo',
                mode: 'literal-paths',
                literalPaths: ['src/file.ts']
            };
            const message = gate().blockMessage(descriptor.repository,
                { status: 'CHANGED', fingerprint: 'a'.repeat(64) }, descriptor, 'no matching receipt');
            const descriptorJson = JSON.stringify(descriptor);

            assert.match(message, /snapshot --target=commit-descriptor/);
            assert.ok(message.includes(descriptorJson), 'snapshot command carries the exact blocked commit descriptor');
            assert.match(message, /issue --kind=skip --scope=full-changeset --snapshot-json=/);
            assert.match(message, /exact descriptor for the snapshot and commit/i);
            assert.doesNotMatch(message, /review-receipt\.cjs skip --reason=/,
                'do not recommend the worktree-only skip wrapper');

            const unsupported = gate().blockMessage(descriptor.repository,
                { status: 'ERROR', errorCode: 'UNSUPPORTED' }, null, 'unsupported commit context');
            assert.match(unsupported, /no supported exact commit descriptor/i);
            assert.doesNotMatch(unsupported, /issue --kind=skip/,
                'unsupported contexts cannot be given a candidate-free skip path');
        }
    },
    {
        // The hook explains the configured default and risk-based alternative without a question;
        // the selector owns the choice, while the hook still requires exact-candidate evidence.
        name: 'REQ-GUARD-03 review selection explains lightweight default and risk-based opt-in without a question',
        fn: async () => {
            // Given: a blocked, unreviewed commit candidate
            const descriptor = { repository: 'C:\\fixture\\repo', cwd: 'C:\\fixture\\repo', mode: 'staged', literalPaths: [] };
            // When: the hook renders its block message
            const message = gate().blockMessage(descriptor.repository,
                { status: 'CHANGED', fingerprint: 'a'.repeat(64) }, descriptor, 'no matching receipt');
            // Then: no choice question; default and fallback remain explicit and configurable.
            assert.doesNotMatch(message, /\(Recommended\)/i, 'a fixed (Recommended) marker must not return to any hook option');
            assert.doesNotMatch(message, /option 1 is recommended|below in order/i, 'the hook must not rank the options');
            assert.doesNotMatch(message, /Ask the user to choose|ASK them first/i, 'the hook must not restore the test/review question');
            assert.match(message, /\/commit-review --fix-loop\s+# default lightweight: every commit tier/);
            assert.match(message, /\/why-review --fix-loop\s+# risk-based mode or PR scope: medium risk/);
            assert.match(message, /\/changes-review --fix-loop\s+# risk-based mode or PR scope: high risk/);
            assert.match(message, /resolve commit.reviewMode with .claude\/scripts\/lib\/commit-review-policy.cjs/);
            assert.match(message, /Lightweight mode never selects an automatic skip/);
            assert.match(message, /Do not ask the user: classify the actual candidate risk[\s\S]{0,40}higher on a tie/,
                'hook must point to the skill rule and the tie-break');
            // The cap matches the shared review policy (scripts/lib/review-policy.cjs MAX_ROUNDS).
            assert.match(message, new RegExp(`at most ${require('../../../scripts/lib/review-policy.cjs').MAX_ROUNDS} review rounds\\. MEDIUM\\+ findings still open at the cap: stop and report, no commit, no skip`));
            assert.match(message, /\/workflow-review-changes --fix-loop also issues a valid receipt when the user asks for the full workflow/);

            // The coordinator delegates selection; executable policy tests own tier behavior.
            const commitSkill = fs.readFileSync(path.resolve(__dirname, '../../../skills/commit/SKILL.md'), 'utf8');
            assert.match(commitSkill, /commit-review-policy\.cjs --operation=commit/);
            assert.match(commitSkill, /at most three rounds/);
            // Then: the skill decides without a test/review question
            assert.doesNotMatch(commitSkill, /\(Recommended\)|Skip stays user-only|Ask initially/i,
                'the commit skill must not restore the test/review question');
            // Then: no other place in the skill restates a fixed recommendation order
            assert.doesNotMatch(commitSkill, /`\/workflow-review-changes --fix-loop` \(recommended\)|> 1\. `Run \/workflow-review-changes --fix-loop` \(Recommended\)|in that order;/i,
                'the fixed workflow-first recommendation must not return');
        }
    },
    {
        name: 'REQ-GUARD-03 an unreviewed candidate is blocked until its tier review or a recorded skip covers it',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed\n');
            git(fx.repoA, ['add', 'file.txt']);

            withStore(fx.store, () => {
                const input = {
                    tool_name: 'Bash',
                    tool_input: { command: 'git commit -m "x"', cwd: fx.repoA }
                };
                const blocked = gate().evaluate(input);
                assert.equal(blocked.code, 2, 'no receipt and no skip must block');
                assert.match(blocked.stderr, /review fix-loop/i);
                assert.match(blocked.stderr, /Do not ask the user: classify the actual candidate risk/i);
                assert.match(blocked.stderr, /Never skip a Medium or High candidate, or a failed review/);

                const hookOptions = [
                    '1. /commit-review --fix-loop',
                    '2. /why-review --fix-loop',
                    '3. /changes-review --fix-loop',
                    '4. Skip — only in risk-based mode for a Low-risk candidate'
                ].map(option => blocked.stderr.indexOf(option));
                assert.ok(hookOptions.every(index => index >= 0), 'hook must show both tier reviews and the Low-risk skip');
                assert.ok(hookOptions[3] > Math.max(...hookOptions.slice(0, 3)), 'Skip must follow every review option');

                issueCandidate(receipt(), fx.store, snapshot(receipt(), fx.repoA), 'skip', {
                    reason: 'auto: low risk — docs only'
                });
                assert.equal(gate().evaluate(input), undefined,
                    'the exact candidate is allowed after a descriptor-bound recorded skip');
            });
        })
    },
    {
        name: 'lightweight commit review clears only the exact staged candidate and refuses stale issuance',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const file = path.join(fx.repoA, 'file.txt');
            fs.writeFileSync(file, 'review candidate\n');
            git(fx.repoA, ['add', 'file.txt']);
            fs.writeFileSync(path.join(fx.repoA, 'unrelated.txt'), 'not in this commit\n');
            const api = receipt();
            const reviewed = snapshot(api, fx.repoA, 'staged');
            const indexBefore = fs.readFileSync(path.join(fx.repoA, '.git', 'index'));
            withStore(fx.store, () => {
                const input = { tool_name: 'Bash', tool_input: { command: 'git commit -m "candidate"', cwd: fx.repoA } };
                assert.equal(gate().evaluate(input).code, 2);
                issueCandidate(api, fx.store, reviewed, 'commit-review');
                assert.equal(api.matchReviewReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: reviewed }), 'commit-review');
                assert.equal(gate().evaluate(input), undefined, 'fresh full-candidate review clears the gate');
                assert.deepEqual(fs.readFileSync(path.join(fx.repoA, '.git', 'index')), indexBefore, 'review evidence never stages files');
                fs.writeFileSync(file, 'later unstaged content\n');
                assert.equal(gate().evaluate(input), undefined, 'unstaged edits do not change a staged commit');
                git(fx.repoA, ['add', 'file.txt']);
                assert.equal(gate().evaluate(input).code, 2, 'changed commit content needs a fresh review');
                assert.throws(() => issueCandidate(api, fx.store, reviewed, 'commit-review'), /reviewed target changed/);
                assert.throws(() => issueCandidate(api, fx.store, snapshot(api, fx.repoA, 'staged'), 'commit-review', { scope: 'subset' }), /full-changeset/);
            });
        })
    },
    {
        name: 'TC-FIT-011 worktree review binds repository, storage, base and exact candidate; identical staging preserves it',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            const indexPath = path.join(fx.repoA, '.git', 'index');
            const indexBefore = fs.readFileSync(indexPath);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'candidate-c\n');

            const snapshot = api.captureReviewTarget({ repository: fx.repoA, cwd: fx.repoA, target: 'worktree' });
            assert.equal(snapshot.status, 'CHANGED');
            assert.equal(snapshot.repository, api.canonicalDirectory(fx.repoA));
            assert.ok(snapshot.storageIdentity, 'candidate includes Git storage identity');
            assert.ok(snapshot.baseTree, 'candidate pins the base tree');
            assert.ok(snapshot.candidateTree, 'candidate pins the exact content tree');
            assert.match(snapshot.fingerprint, /^[a-f0-9]{64}$/);
            assert.deepEqual(fs.readFileSync(indexPath), indexBefore, 'capture preserves real index bytes');

            withStore(fx.store, () => api.issueReceipt({
                repository: fx.repoA,
                snapshot,
                scope: 'full-changeset',
                kind: 'changes-review'
            }));
            git(fx.repoA, ['add', 'file.txt']);
            const staged = api.captureReviewTarget({ repository: fx.repoA, cwd: fx.repoA, target: 'staged' });
            assert.equal(staged.status, 'CHANGED');
            assert.equal(staged.candidateTree, snapshot.candidateTree, 'same staged content has the same tree');
            assert.equal(staged.fingerprint, snapshot.fingerprint, 'capture target does not change candidate identity');

            withStore(fx.store, () => {
                const result = gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -m x', cwd: fx.repoA } });
                assert.equal(result, undefined, 'the matching staged tree uses the worktree receipt');
            });

            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'candidate-b\n');
            git(fx.repoA, ['add', 'file.txt']);
            const other = api.captureReviewTarget({ repository: fx.repoA, cwd: fx.repoA, target: 'staged' });
            assert.notEqual(other.candidateTree, snapshot.candidateTree);
            assert.notEqual(other.fingerprint, snapshot.fingerprint);
            withStore(fx.store, () => {
                const result = gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -m x', cwd: fx.repoA } });
                assert.equal(result.code, 2, 'a receipt for candidate C cannot authorize staged candidate B');
            });
        })
    },
    {
        name: 'TC-FIT-011 staged, -a and literal-path candidates preserve index bytes and honor deletions',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            const indexPath = path.join(fx.repoA, '.git', 'index');
            const indexBefore = fs.readFileSync(indexPath);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'tracked-change\n');
            fs.writeFileSync(path.join(fx.repoA, 'untracked.txt'), 'untracked\n');

            const staged = snapshot(api, fx.repoA, 'staged');
            const all = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'all', literalPaths: [] });
            const literal = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'literal-paths', literalPaths: ['file.txt'] });
            const worktree = snapshot(api, fx.repoA, 'worktree');
            assert.equal(staged.status, 'CLEAN', 'default-index mode excludes unstaged files');
            assert.equal(all.status, 'CHANGED', '-a includes tracked modifications');
            assert.equal(literal.candidateTree, all.candidateTree, 'literal file candidate excludes unrelated untracked content');
            assert.notEqual(worktree.candidateTree, all.candidateTree, 'worktree target also includes untracked files');
            assert.equal(all.descriptor.mode, 'all');
            assert.equal(literal.descriptor.literalPaths[0], 'file.txt');
            assert.deepEqual(fs.readFileSync(indexPath), indexBefore, 'all candidate captures leave the real index byte-identical');

            fs.unlinkSync(path.join(fx.repoA, 'file.txt'));
            const deletion = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'all', literalPaths: [] });
            const literalDeletion = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'literal-paths', literalPaths: ['file.txt'] });
            assert.equal(deletion.status, 'CHANGED', '-a includes tracked deletions');
            assert.equal(literalDeletion.candidateTree, deletion.candidateTree, 'literal path mode includes the exact tracked deletion');
            assert.deepEqual(fs.readFileSync(indexPath), indexBefore, 'deletion evaluation also preserves the real index');
        })
    },
    {
        name: 'TC-FIT-011 a matching candidate tree with a changed base tree does not reuse the old receipt',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'reviewed-tree\n');
            const reviewed = snapshot(api, fx.repoA);
            issueCandidate(api, fx.store, reviewed);

            fs.writeFileSync(path.join(fx.repoA, 'extra.txt'), 'committed-base-change\n');
            git(fx.repoA, ['add', 'extra.txt']);
            git(fx.repoA, ['commit', '-q', '-m', 'advance base']);
            fs.unlinkSync(path.join(fx.repoA, 'extra.txt'));
            git(fx.repoA, ['add', '-A']);

            const current = snapshot(api, fx.repoA, 'staged');
            assert.equal(current.candidateTree, reviewed.candidateTree, 'the resulting content tree is byte-for-byte the reviewed tree');
            assert.notEqual(current.baseTree, reviewed.baseTree, 'HEAD advanced after review');
            assert.notEqual(current.fingerprint, reviewed.fingerprint, 'base tree is part of candidate identity');
            withStore(fx.store, () => {
                const blocked = gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -m x', cwd: fx.repoA } });
                assert.equal(blocked.code, 2, 'same tree contents on another base are not the reviewed commit candidate');
            });
        })
    },
    {
        name: 'TC-FIT-011 issuance rechecks its original target and candidate errors fail closed',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'reviewed-candidate\n');
            const reviewed = snapshot(api, fx.repoA, 'worktree');
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed-before-issuance\n');
            assert.throws(() => issueCandidate(api, fx.store, reviewed), /target changed/,
                'issuance must not silently switch to the post-review content');

            const indexPath = path.join(fx.repoA, '.git', 'index');
            const indexBefore = fs.readFileSync(indexPath);
            const failingExec = (file, args, options) => {
                if (args[0] === 'write-tree') throw Object.assign(new Error('injected tree failure'), { code: 'INJECTED_GIT_FAILURE' });
                return execFileSync(file, args, options);
            };
            const failed = api.captureReviewTarget({ repository: fx.repoA, cwd: fx.repoA, target: 'worktree', exec: failingExec });
            assert.equal(failed.status, 'ERROR');
            assert.equal(failed.errorCode, 'INJECTED_GIT_FAILURE');
            assert.throws(() => api.computeChangeFingerprint(fx.repoA, failingExec), /injected tree failure/,
                'legacy helper does not collapse Git errors to clean');
            assert.deepEqual(fs.readFileSync(indexPath), indexBefore, 'success and error paths preserve the real index');
            assert.deepEqual(fs.readdirSync(path.join(fx.repoA, 'tmp')), [], 'throwaway state is cleaned from repository tmp');

            const blocked = gate().evaluate(
                { tool_name: 'Bash', tool_input: { command: 'git commit -m x', cwd: fx.repoA } },
                { captureReviewTarget: () => failed }
            );
            assert.equal(blocked.code, 2, 'a candidate computation error is a block, never clean or skip');
            assert.match(blocked.stderr, /ERROR \(INJECTED_GIT_FAILURE\)/);
        })
    },
    {
        name: 'TC-FIT-011 only a confirmed unborn HEAD is clean-compatible',
        skip: !GIT,
        fn: async () => fixture(fx => {
            git(fx.repoA, ['init', '-q']);
            git(fx.repoA, ['config', 'user.email', 'test@example.com']);
            git(fx.repoA, ['config', 'user.name', 'Test']);
            fs.writeFileSync(path.join(fx.repoA, '.gitignore'), '/tmp/\n/temp/\n');
            const api = receipt();
            assert.equal(snapshot(api, fx.repoA, 'staged').status, 'CLEAN', 'empty unborn branch has a valid empty-tree base');
            fs.writeFileSync(path.join(fx.repoA, 'initial.txt'), 'first content\n');
            const initial = snapshot(api, fx.repoA, 'worktree');
            assert.equal(initial.status, 'CHANGED');
            assert.ok([40, 64].includes(initial.baseTree.length), 'empty tree ID follows the repository object format');

            fs.writeFileSync(path.join(fx.repoA, '.git', 'HEAD'), 'unresolvable head state\n');
            const invalid = snapshot(api, fx.repoA, 'worktree');
            assert.equal(invalid.status, 'ERROR', 'an unresolvable HEAD is not treated as unborn or clean');
        })
    },
    {
        name: 'TC-FIT-011 gate matches -a and literal-path descriptors and rejects unsupported contexts',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'all-candidate\n');
            const all = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'all', literalPaths: [] });
            issueCandidate(api, fx.store, all);
            withStore(fx.store, () => {
                for (const command of ['git commit -a -m x', 'git commit -am x', 'git commit --all -m x']) {
                    const allCommit = gate().evaluate({ tool_name: 'Bash', tool_input: { command, cwd: fx.repoA } });
                    assert.equal(allCommit, undefined, `${command} matches the exact all-tracked candidate`);
                }
            });

            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'literal-candidate\n');
            fs.writeFileSync(path.join(fx.repoA, 'other.txt'), 'not in literal candidate\n');
            const literal = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'literal-paths', literalPaths: ['file.txt'] });
            issueCandidate(api, fx.store, literal);
            withStore(fx.store, () => {
                const literalCommit = gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -- file.txt', cwd: fx.repoA } });
                assert.equal(literalCommit, undefined, 'literal receipt matches only its exact path candidate');
                for (const command of [
                    "git commit -- '*.txt'",
                    'git commit -- :/file.txt',
                    'git commit --only -m x',
                    'git commit --pathspec-from-file=paths.txt',
                    'git commit --pathspec-file-nul --pathspec-from-file=paths.txt',
                    'git -c core.filemode=false commit -m x',
                    'git --git-dir=.git commit -m x',
                    'git --work-tree=. commit -m x',
                    'git --config-env=core.filemode=ORIENT_TEST_GIT_CONFIG commit -m x',
                    'git --literal-pathspecs commit -- file.txt',
                    'GIT_INDEX_FILE=alternate.index git commit -m x',
                    'cd subdir && git commit -m x',
                    'git commit -a -- file.txt',
                    'bash -c "git commit $MESSAGE"'
                ]) {
                    const result = gate().evaluate({ tool_name: 'Bash', tool_input: { command, cwd: fx.repoA } });
                    assert.equal(result.code, 2, `${command} must fail closed`);
                }

                for (const [name, value] of [
                    ['GIT_CONFIG_GLOBAL', path.join(fx.repoA, 'alternate-git-config')],
                    ['GIT_LITERAL_PATHSPECS', '1']
                ]) {
                    const previous = process.env[name];
                    try {
                        process.env[name] = value;
                        const result = gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -m x', cwd: fx.repoA } });
                        assert.equal(result.code, 2, `${name} ambient context must fail closed`);
                    } finally {
                        if (previous === undefined) delete process.env[name];
                        else process.env[name] = previous;
                    }
                }
            });
        })
    },
    {
        name: 'TC-FIT-011 host-injected content-neutral GIT_CONFIG pairs are accepted; any other injected key fails closed',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed\n');
            const withEnv = (vars, fn) => {
                const prev = {};
                for (const k of Object.keys(vars)) { prev[k] = process.env[k]; process.env[k] = vars[k]; }
                try { return fn(); } finally {
                    for (const k of Object.keys(vars)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; }
                }
            };
            const container = {
                GIT_CONFIG_COUNT: '3',
                GIT_CONFIG_KEY_0: 'credential.interactive', GIT_CONFIG_VALUE_0: 'false',
                GIT_CONFIG_KEY_1: 'url.https://github.com/.insteadOf', GIT_CONFIG_VALUE_1: 'git@github.com:',
                GIT_CONFIG_KEY_2: 'url.https://github.com/.insteadOf', GIT_CONFIG_VALUE_2: 'ssh://git@github.com/'
            };
            assert.equal(withEnv(container, () => snapshot(api, fx.repoA)).status, 'CHANGED',
                'the cloud container proxy config must not block candidate capture');
            for (const [label, bad] of [
                ['core.worktree key', { ...container, GIT_CONFIG_KEY_1: 'core.worktree' }],
                ['count/pair mismatch', { ...container, GIT_CONFIG_COUNT: '2' }],
                ['core.hooksPath only', { GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.hooksPath', GIT_CONFIG_VALUE_0: '/tmp/x' }],
                ['GIT_CONFIG_PARAMETERS alongside', { ...container, GIT_CONFIG_PARAMETERS: "'core.worktree=/x'" }]
            ]) {
                const s = withEnv(bad, () => snapshot(api, fx.repoA));
                assert.equal(s.status, 'ERROR', `${label} must fail closed`);
                assert.equal(s.errorCode, 'UNSUPPORTED_GIT_ENVIRONMENT', `${label} error code`);
            }
        })
    },
    {
        name: 'TC-FIT-011 isolated source mutants are killed for candidate loss, ERROR collapse and descriptor deduplication',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const tempHooks = path.join(fx.repoA, 'tmp');
            fs.mkdirSync(tempHooks, { recursive: true });
            const receiptSource = fs.readFileSync(LIB, 'utf8');
            const contentMutant = receiptSource
                .replace('return sha256(JSON.stringify({ repository, storageIdentity, baseTree, candidateTree }));',
                    'return sha256(JSON.stringify({ repository, storageIdentity, baseTree }));')
                .replace('record.candidateTree === ctx.candidateTree &&', '');
            assert.notEqual(contentMutant, receiptSource, 'candidate-loss mutant applies to an isolated source copy');
            const contentMutantPath = path.join(tempHooks, 'mutant-receipt-candidate.cjs');
            fs.writeFileSync(contentMutantPath, contentMutant);
            delete require.cache[require.resolve(contentMutantPath)];
            const weakenedReceipt = require(contentMutantPath);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'reviewed-content\n');
            const reviewed = snapshot(weakenedReceipt, fx.repoA);
            weakenedReceipt.issueReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: reviewed,
                scope: 'full-changeset', kind: 'changes-review' });
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'different-content\n');
            const changed = snapshot(weakenedReceipt, fx.repoA);
            const candidateMutantAccepted = weakenedReceipt.checkReceipt({ repository: fx.repoA, storeDir: fx.store,
                snapshot: changed, kind: 'changes-review' });
            assert.equal(candidateMutantAccepted, true, 'mutant demonstrates the old candidate-loss defect');
            assert.throws(() => assert.equal(candidateMutantAccepted, false), assert.AssertionError,
                'the candidate mismatch regression fails against the isolated mutant');

            const errorMutantSource = receiptSource.replace(
                'result = errorSnapshot(target, error, repository, cwd);',
                "result = { status: 'CLEAN', repository, storageIdentity: null, cwd, indexPath: null, baseTree: null, candidateTree: null, fingerprint: null, target, descriptor: null };"
            );
            assert.notEqual(errorMutantSource, receiptSource, 'ERROR-collapse mutant applies to an isolated source copy');
            const errorMutantPath = path.join(tempHooks, 'mutant-receipt-error.cjs');
            fs.writeFileSync(errorMutantPath, errorMutantSource);
            delete require.cache[require.resolve(errorMutantPath)];
            const weakenedError = require(errorMutantPath);
            const failingExec = (file, args, options) => {
                if (args[0] === 'write-tree') throw Object.assign(new Error('injected tree failure'), { code: 'INJECTED_GIT_FAILURE' });
                return execFileSync(file, args, options);
            };
            const collapsed = weakenedError.captureReviewTarget({ repository: fx.repoA, cwd: fx.repoA, target: 'worktree', exec: failingExec });
            assert.equal(collapsed.status, 'CLEAN', 'mutant demonstrates ERROR collapsing to CLEAN');
            assert.throws(() => assert.equal(collapsed.status, 'ERROR'), assert.AssertionError,
                'the candidate-error regression fails against the isolated mutant');
            const gateAfterErrorMutant = gate().evaluate(
                { tool_name: 'Bash', tool_input: { command: 'git commit -m x', cwd: fx.repoA } },
                { captureReviewTarget: () => collapsed }
            );
            assert.equal(gateAfterErrorMutant, undefined, 'an ERROR-to-CLEAN mutant would pass the gate');
            assert.throws(() => assert.equal(gateAfterErrorMutant?.code, 2), assert.AssertionError,
                'the gate error-block regression fails against the isolated mutant');

            const gateSource = fs.readFileSync(HOOK, 'utf8');
            const duplicateBranch = /if \(statementRepos\.has\(descriptor\.repository\)\) \{\s*return \{ known: false, reason: 'Multiple sequential commits to one repository require separate reviewed invocations' \};\s*\}\s*statementRepos\.add\(descriptor\.repository\);\s*descriptors\.push\(descriptor\);/;
            const dedupeMutantSource = gateSource.replace(duplicateBranch,
                'if (!statementRepos.has(descriptor.repository)) { statementRepos.add(descriptor.repository); descriptors.push(descriptor); }');
            assert.notEqual(dedupeMutantSource, gateSource, 'repository-deduplication mutant applies to an isolated source copy');
            const mutantGatePath = path.join(tempHooks, 'mutant-review-commit-gate.cjs');
            fs.writeFileSync(mutantGatePath, dedupeMutantSource);
            const statements = [
                { command: { value: 'git' }, argv: [{ value: 'git', static: true }, { value: 'commit', static: true }], assignments: [] },
                { command: { value: 'git' }, argv: [{ value: 'git', static: true }, { value: 'commit', static: true }], assignments: [] }
            ];
            const weakenedGate = loadMutantGate(mutantGatePath, fx.repoA, statements);
            const deduped = weakenedGate.resolveCommitDescriptors('git commit && git commit', fx.repoA);
            assert.equal(deduped.known, true);
            assert.equal(deduped.descriptors.length, 1, 'mutant demonstrates repository-only descriptor deduplication');
            assert.throws(() => assert.equal(deduped.known, false), assert.AssertionError,
                'the sequential-commit regression fails against the isolated mutant');
        })
    },
    {
        name: 'TC-HARNESS-GATE receipt binds exact fingerprint, repository and kind; skip is separate',
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'reviewed\n');
            const api = receipt();
            const candidate = snapshot(api, fx.repoA);
            issueCandidate(api, fx.store, candidate, 'changes-review', { now: NOW });
            const check = extra => api.checkReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: candidate, now: NOW, ...extra });
            assert.equal(check({ kind: 'changes-review' }), true);
            assert.equal(check({ kind: 'why-review' }), false, 'kind must be exact');
            assert.equal(check({ kind: 'workflow-review-changes' }), false);
            assert.equal(check({ kind: 'skip' }), false);
            assert.equal(api.matchReviewReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: candidate, now: NOW }), 'changes-review');
            assert.equal(api.matchSkipReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: candidate, now: NOW }), null);
            assert.equal(api.checkReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: { ...candidate, fingerprint: FP_B }, kind: 'changes-review', now: NOW }), false, 'fingerprint must match tree identity');
            assert.equal(api.checkReceipt({ repository: fx.repoB, storeDir: fx.store, snapshot: { ...candidate, repository: fx.repoB }, kind: 'changes-review', now: NOW }), false, 'repository must match');

            issueCandidate(api, fx.store, candidate, 'skip', { now: NOW });
            assert.equal(api.matchSkipReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: candidate, now: NOW }), 'skip');
        })
    },
    {
        name: 'TC-HARNESS-GATE receipt rejects expiry, future issue time, malformed input and over-long lifetime',
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'reviewed\n');
            const api = receipt();
            const candidate = snapshot(api, fx.repoA);
            const issued = issueCandidate(api, fx.store, candidate, 'changes-review', { now: NOW, ttlMs: 1 });
            const at = now => api.checkReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: candidate, kind: 'changes-review', now });
            assert.equal(at(NOW), true);
            assert.equal(at(NOW + 1), false, 'exact expiry boundary');
            assert.equal(at(NOW - 1), false, 'future issue time is not active');
            const repositoryStore = path.join(fx.store, fs.readdirSync(fx.store)[0]);
            const recordPath = path.join(repositoryStore, `changes-review.${issued.fingerprint}.json`);
            const oldRecord = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
            oldRecord.schemaVersion = 1;
            fs.writeFileSync(recordPath, JSON.stringify(oldRecord));
            assert.equal(at(NOW), false, 'schema-1 receipts are versioned out');

            for (const bad of [
                { kind: 'nope' },
                { fingerprint: 'zz' },
                { ttlMs: 0 },
                { ttlMs: api.MAX_LIFETIME_MS + 1 },
                { repository: 'relative/path' }
            ]) {
                assert.throws(() => api.issueReceipt({ repository: fx.repoA, storeDir: fx.store, snapshot: candidate,
                    scope: 'full-changeset', kind: 'changes-review', now: NOW, ...bad }), JSON.stringify(bad));
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
            git(fx.repoA, ['add', 'file.txt']);
            withStore(fx.store, () => {
                const commit = () => gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -m "x"', cwd: fx.repoA } });
                assert.equal(commit().code, 2, 'unreviewed commit must block');
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'bash -c "git commit -m x"', cwd: fx.repoA } }).code, 2, 'a wrapped commit must block');
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git commit -F -', cwd: fx.repoA } }).code, 2, 'stdin-message commit must block');
                assert.equal(gate().evaluate({ tool_name: 'Bash', tool_input: { command: 'git status', cwd: fx.repoA } }), undefined, 'non-commit passes');
                assert.equal(gate().evaluate({ tool_name: 'Read', tool_input: { command: 'git commit -m x' } }), undefined, 'non-Bash passes');

                issueCandidate(receipt(), fx.store, snapshot(receipt(), fx.repoA), 'changes-review');
                assert.equal(commit(), undefined, 'reviewed commit passes');

                fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'changed after review\n');
                git(fx.repoA, ['add', 'file.txt']);
                assert.equal(commit().code, 2, 'edit after review re-arms the gate');
                issueCandidate(receipt(), fx.store, snapshot(receipt(), fx.repoA), 'skip', { reason: 'user approved skip' });
                assert.equal(commit(), undefined, 'user-approved skip passes');
            });
        })
    },
    {
        // Amend and `reset --soft HEAD~1` + commit produce the same commit, so they must be gated
        // identically: one receipt over the candidate against HEAD's PARENT authorizes either path,
        // and a receipt over the candidate against HEAD (a plain commit) authorizes neither.
        name: 'REQ-GUARD-03 amend is gated like the equivalent reset --soft + commit, against HEAD\'s parent',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'second\n');
            git(fx.repoA, ['commit', '-q', '-am', 'second']);
            fs.writeFileSync(path.join(fx.repoA, 'extra.txt'), 'staged for amend\n');
            git(fx.repoA, ['add', 'extra.txt']);
            const api = receipt();
            const parentTree = git(fx.repoA, ['rev-parse', 'HEAD~1^{tree}']).trim();

            const amendCandidate = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'staged', literalPaths: [], amend: true });
            assert.equal(amendCandidate.status, 'CHANGED');
            assert.equal(amendCandidate.baseTree, parentTree, 'amend candidate is measured against HEAD\'s parent');
            assert.equal(amendCandidate.descriptor.amend, true);
            const plainCandidate = snapshot(api, fx.repoA, 'staged');
            assert.equal(plainCandidate.candidateTree, amendCandidate.candidateTree, 'same staged content');
            assert.notEqual(plainCandidate.fingerprint, amendCandidate.fingerprint, 'a different base is a different candidate');

            withStore(fx.store, () => {
                const amend = command => gate().evaluate({ tool_name: 'Bash', tool_input: { command, cwd: fx.repoA } });
                const unreviewed = amend('git commit --amend --no-edit');
                assert.equal(unreviewed.code, 2, 'an unreviewed amend must block');
                // The recovery path must lead to a receipt that CAN match: the amend descriptor.
                assert.match(unreviewed.stderr, /HEAD's parent/);
                assert.match(unreviewed.stderr, /--descriptor-json='\{[^']*"amend":true\}'/);
                assert.doesNotMatch(amend('git commit -m plain').stderr, /HEAD's parent/, 'a plain commit gets no amend guidance');
                issueCandidate(api, fx.store, plainCandidate);
                assert.equal(amend('git commit --amend --no-edit').code, 2, 'a plain-commit receipt cannot authorize an amend');
                issueCandidate(api, fx.store, amendCandidate);
                for (const command of ['git commit --amend --no-edit', 'git commit --amen --no-edit', 'git commit --am -m x']) {
                    assert.equal(amend(command), undefined, `${command} matches the reviewed amend candidate`);
                }
                assert.equal(amend('git commit --amend=x').code, 2, 'a malformed amend flag fails closed');
            });

            // The receipt must describe the commit git actually produces, and the reset path must
            // produce the identical candidate.
            git(fx.repoA, ['commit', '-q', '--amend', '--no-edit']);
            assert.equal(git(fx.repoA, ['rev-parse', 'HEAD^{tree}']).trim(), amendCandidate.candidateTree);
            assert.equal(git(fx.repoA, ['rev-parse', 'HEAD~1^{tree}']).trim(), amendCandidate.baseTree);
            git(fx.repoA, ['reset', '-q', '--soft', 'HEAD~1']);
            const resetCandidate = snapshot(api, fx.repoA, 'staged');
            assert.equal(resetCandidate.fingerprint, amendCandidate.fingerprint, 'reset --soft + commit is the same candidate');
        })
    },
    {
        name: 'REQ-GUARD-03 amend literal paths build on HEAD, root commits use the empty tree, merges fail closed',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            const api = receipt();
            const root = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'staged', literalPaths: [], amend: true });
            assert.equal(root.status, 'CHANGED', 'amending the root commit reviews its whole content');
            assert.equal(root.baseTree, git(fx.repoA, ['mktree']).trim(), 'root amend base is the empty tree');

            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'literal amend\n');
            fs.writeFileSync(path.join(fx.repoA, 'other.txt'), 'not part of the amend\n');
            const literal = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'literal-paths', literalPaths: ['file.txt'], amend: true });
            git(fx.repoA, ['commit', '-q', '--amend', '--no-edit', '--', 'file.txt']);
            assert.equal(git(fx.repoA, ['rev-parse', 'HEAD^{tree}']).trim(), literal.candidateTree,
                'literal-path amend candidate equals the tree git commits');

            git(fx.repoA, ['checkout', '-q', '-b', 'side']);
            fs.writeFileSync(path.join(fx.repoA, 'side.txt'), 'side\n');
            git(fx.repoA, ['add', 'side.txt']);
            git(fx.repoA, ['commit', '-q', '-m', 'side']);
            git(fx.repoA, ['checkout', '-q', '-']);
            git(fx.repoA, ['merge', '-q', '--no-ff', '--no-edit', 'side']);
            const merge = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'staged', literalPaths: [], amend: true });
            assert.equal(merge.status, 'ERROR');
            assert.equal(merge.errorCode, 'UNSUPPORTED_AMEND_MERGE');
        })
    },
    {
        // Invariant: amend is read from the SAME parse that assigns option values. The dangerous
        // candidate is a staged revert of HEAD: measured as an amend (against HEAD's parent) it is
        // CLEAN and needs no receipt, so a plain commit misread as an amend would skip review.
        name: 'REQ-GUARD-03 amend is detected only in option position, never inside an option value',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeRepo(fx.repoA);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'second\n');
            git(fx.repoA, ['commit', '-q', '-am', 'second']);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'base\n');
            git(fx.repoA, ['add', 'file.txt']);
            assert.equal(git(fx.repoA, ['write-tree']).trim(), git(fx.repoA, ['rev-parse', 'HEAD~1^{tree}']).trim(),
                'fixture: the staged tree reverts HEAD');
            withStore(fx.store, () => {
                const run = command => gate().evaluate({ tool_name: 'Bash', tool_input: { command, cwd: fx.repoA } });
                for (const command of ['git commit -am --amend', 'git commit -sm --amend', 'git commit -m --amend',
                    'git commit --message --amend', 'git commit --author --amend -m x']) {
                    assert.equal(run(command)?.code, 2, `${command} is a plain unreviewed commit and must block`);
                }
                for (const command of ['git commit --amend --no-edit', 'git commit --amen --no-edit', 'git commit --ame --no-edit',
                    'git commit --am --no-edit', 'git commit --no-edit --am', 'git commit -m x --amend']) {
                    assert.equal(run(command), undefined, `${command} is an amend whose candidate equals HEAD's parent`);
                }
            });
        })
    },
    {
        name: 'REQ-GUARD-03 amend descriptor edges: unborn HEAD and non-boolean amend fail closed, -a amend matches git',
        skip: !GIT,
        fn: async () => fixture(fx => {
            const api = receipt();
            git(fx.repoA, ['init', '-q']);
            fs.writeFileSync(path.join(fx.repoA, 'file.txt'), 'unborn\n');
            git(fx.repoA, ['add', 'file.txt']);
            const unborn = snapshot(api, fx.repoA, 'commit-descriptor', { mode: 'staged', literalPaths: [], amend: true });
            assert.equal(unborn.status, 'ERROR');
            assert.equal(unborn.errorCode, 'AMEND_WITHOUT_HEAD');

            makeRepo(fx.repoB);
            const invalid = snapshot(api, fx.repoB, 'commit-descriptor', { mode: 'staged', literalPaths: [], amend: 'yes' });
            assert.equal(invalid.status, 'ERROR');
            assert.equal(invalid.errorCode, 'INVALID_DESCRIPTOR');

            fs.writeFileSync(path.join(fx.repoB, 'file.txt'), 'second\n');
            git(fx.repoB, ['commit', '-q', '-am', 'second']);
            fs.writeFileSync(path.join(fx.repoB, 'file.txt'), 'unstaged tracked edit\n');
            const all = snapshot(api, fx.repoB, 'commit-descriptor', { mode: 'all', literalPaths: [], amend: true });
            assert.equal(all.baseTree, git(fx.repoB, ['rev-parse', 'HEAD~1^{tree}']).trim());
            git(fx.repoB, ['commit', '-q', '-a', '--amend', '--no-edit']);
            assert.equal(git(fx.repoB, ['rev-parse', 'HEAD^{tree}']).trim(), all.candidateTree,
                '-a amend candidate equals the tree git commits');
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
            git(fx.repoA, ['add', 'file.txt']);
            git(fx.repoB, ['add', 'file.txt']);
            withStore(fx.store, () => {
                const compound = `git -C "${fx.repoA}" commit -m a && git -C "${fx.repoB}" commit -m b`;
                const run = () => gate().evaluate({ tool_name: 'Bash', tool_input: { command: compound, cwd: fx.repoA } });
                assert.equal(run().code, 2, 'no receipts must block');
                issueCandidate(receipt(), fx.store, snapshot(receipt(), fx.repoA), 'changes-review');
                assert.equal(run().code, 2, 'a receipt for only the first repository must still block');
                issueCandidate(receipt(), fx.store, snapshot(receipt(), fx.repoB), 'changes-review');
                assert.equal(run(), undefined, 'receipts for both repositories pass');
                const repeated = gate().evaluate({ tool_name: 'Bash', tool_input: {
                    command: 'git commit -m first && git commit -m second', cwd: fx.repoA
                } });
                assert.equal(repeated.code, 2, 'same-repository sequential commits need separate invocations');
                assert.match(repeated.stderr, /separate reviewed invocations/);
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
            const captured = call(['snapshot', '--target=worktree']);
            assert.equal(captured.status, 0, captured.stderr);
            const snapshotJson = captured.stdout.trim();
            const issued = call(['issue', '--kind=changes-review', '--scope=full-changeset', `--snapshot-json=${snapshotJson}`]);
            assert.equal(issued.status, 0, issued.stderr);
            assert.match(JSON.parse(issued.stdout).fingerprint, /^[a-f0-9]{64}$/);

            const checked = call(['check']);
            assert.equal(checked.status, 0, checked.stderr);
            const state = JSON.parse(checked.stdout);
            assert.equal(state.status, 'CHANGED');
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

// ---- reviewGate.status: the "Review validation" commit status (publish-status) ---------------

const STATUS_ON = Object.freeze({ enabled: true, context: 'Review validation', requireAttestation: false });
const BYPASS_REASON = 'CI configuration only, reviewed in the platform repo';

/** main carries the base (and an optional project config); `feature` adds one reviewed commit. */
function makeStatusRepo(dir, config) {
    makeRepo(dir);
    if (config) {
        fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), JSON.stringify(config));
        git(dir, ['add', 'docs/project-config.json']);
        git(dir, [C_ARG, '-q', '-m', 'config']);
    }
    git(dir, ['branch', '-M', 'main']);
    git(dir, ['switch', '-q', '-c', 'feature']);
    fs.writeFileSync(path.join(dir, 'feature.txt'), 'feature\n');
    git(dir, ['add', 'feature.txt']);
    git(dir, [C_ARG, '-q', '-m', 'feature']);
}

const headOf = dir => git(dir, ['rev-parse', 'HEAD']).trim();

/** A stand-in for gh: records every argv and answers like GitHub for one pull request. */
function fakeGh(pull) {
    const calls = [];
    const gh = args => {
        calls.push(args);
        if (args[0] === 'repo') return 'acme/widgets\n';
        if (args[0] === 'api' && args[1] !== '--method') return JSON.stringify({ state: 'open', base: { ref: 'main' }, ...pull });
        return '{}';
    };
    return { gh, calls, posts: () => calls.filter(args => args[1] === '--method') };
}

function publishStatus(api, fx, extra = {}) {
    const fake = extra.fake || fakeGh({ head: { sha: headOf(fx.repoA) } });
    const { fake: _ignored, ...rest } = extra;
    const result = api.publishReviewStatus({ repository: fx.repoA, storeDir: fx.store, pr: 7, gh: fake.gh,
        reviewStatus: STATUS_ON, reviewGateMode: 'off', ...rest });
    return { result, fake };
}

/** Issue a receipt of `kind` over the committed head's whole-branch snapshot. */
function receiptForHead(api, fx, kind = 'changes-review', extra = {}) {
    const head = snapshot(api, fx.repoA, 'branch', { base: 'main', committed: true });
    return issueCandidate(api, fx.store, head, kind, { reviewGateMode: 'off', ...extra });
}

function commitBypass(dir, { reason = BYPASS_REASON, pr = '7', parent, lines, changeFile = false, after } = {}) {
    const parentSha = parent ?? headOf(dir);
    if (changeFile) {
        fs.writeFileSync(path.join(dir, 'feature.txt'), 'changed under a bypass\n');
        git(dir, ['add', 'feature.txt']);
    }
    const trailers = lines || ['Review-Bypass: true', `Review-Bypass-Reason: ${reason}`, `Review-Bypass-PR: ${pr}`, `Review-Bypass-Parent: ${parentSha}`];
    git(dir, [C_ARG, '-q', ...(changeFile ? [] : ['--allow-empty']), '-m', 'chore: skip review', '-m', trailers.join('\n'), ...(after ? ['-m', after] : [])]);
}

const STATUS_TESTS = [
    {
        name: 'TC-RGE-016 publish-status posts success on the PR head when a whole-branch review receipt matches it, with the exact gh argv',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeStatusRepo(fx.repoA, { reviewGate: { status: { enabled: true, context: 'Review policy' } } });
            const api = receipt();
            receiptForHead(api, fx, 'workflow-review-changes');
            const sha = headOf(fx.repoA);
            const tree = git(fx.repoA, ['rev-parse', 'HEAD^{tree}']).trim();
            const fake = fakeGh({ head: { sha } });
            // No policy override: the project config on the branch turns the status on and names it.
            const result = api.publishReviewStatus({ repository: fx.repoA, storeDir: fx.store, pr: '7', gh: fake.gh });
            assert.equal(result.status, 'PUBLISHED', result.reason);
            assert.equal(result.via, 'review');
            assert.equal(result.description, `reviewed: workflow-review-changes; tree=${tree}`);
            assert.deepEqual(fake.calls, [
                ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'],
                ['api', 'repos/acme/widgets/pulls/7'],
                ['api', '--method', 'POST', `repos/acme/widgets/statuses/${sha}`, '-f', 'state=success', '-f', 'context=Review policy',
                    '-f', `description=reviewed: workflow-review-changes; tree=${tree}`]
            ], 'gh resolves the repository, reads the PR, then posts one status on the head SHA');

            const named = publishStatus(api, fx, { githubRepository: 'acme/other' });
            assert.equal(named.result.status, 'PUBLISHED');
            assert.equal(named.fake.calls[0][1], 'repos/acme/other/pulls/7', '--repository skips the lookup');
            // A new commit needs its own status; an empty commit leaves the reviewed tree, so the receipt still matches it.
            git(fx.repoA, [C_ARG, '-q', '--allow-empty', '-m', 'ci: retrigger']);
            assert.equal(publishStatus(api, fx).result.status, 'PUBLISHED', 'same tree on a new SHA: the receipt matches again');
            assert.equal(publishStatus(api, fx, { githubRepository: 'not a slug' }).result.status, 'REFUSED');
        })
    },
    {
        name: 'TC-RGE-017 publish-status is off by default and refuses without calling gh',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeStatusRepo(fx.repoA);
            const api = receipt();
            receiptForHead(api, fx);
            const fake = fakeGh({ head: { sha: headOf(fx.repoA) } });
            const result = api.publishReviewStatus({ repository: fx.repoA, storeDir: fx.store, pr: 7, gh: fake.gh });
            assert.equal(result.status, 'REFUSED');
            assert.match(result.reason, /reviewGate\.status\.enabled/);
            assert.deepEqual(fake.calls, [], 'nothing is read or posted while the status is off');
            assert.match(publishStatus(api, fx, { pr: 'abc' }).result.reason, /--pr=/, 'a pull request number is required');
        })
    },
    {
        name: 'TC-RGE-018 with no matching review receipt it refuses and says how to review or bypass; a skip receipt does not count',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeStatusRepo(fx.repoA);
            const api = receipt();
            receiptForHead(api, fx, 'skip', { reason: 'user approved skip' });
            const { result, fake } = publishStatus(api, fx);
            assert.equal(result.status, 'REFUSED', 'a recorded skip is not a review');
            assert.match(result.reason, /no review receipt matches pull request #7/);
            assert.match(result.reason, /\/changes-review --fix-loop/);
            assert.match(result.reason, /--target=branch --base=main/);
            assert.match(result.reason, new RegExp(`Review-Bypass-Parent: ${headOf(fx.repoA)}`));
            assert.deepEqual(fake.posts(), [], 'nothing is posted');
            // A receipt for the working tree before a later change does not cover the changed head.
            receiptForHead(api, fx);
            fs.writeFileSync(path.join(fx.repoA, 'feature.txt'), 'changed after the review\n');
            git(fx.repoA, [C_ARG, '-q', '-am', 'after review']);
            assert.equal(publishStatus(api, fx).result.status, 'REFUSED', 'a commit after the review needs a fresh review');
        })
    },
    {
        name: 'TC-RGE-019 a PR head other than the local committed HEAD, a closed PR or another base is refused',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeStatusRepo(fx.repoA);
            const api = receipt();
            receiptForHead(api, fx);
            const parent = git(fx.repoA, ['rev-parse', 'HEAD~1']).trim();
            const stale = publishStatus(api, fx, { fake: fakeGh({ head: { sha: parent } }) });
            assert.equal(stale.result.status, 'REFUSED');
            assert.match(stale.result.reason, /head is [a-f0-9]{40} but this checkout's committed HEAD is/);
            assert.deepEqual(stale.fake.posts(), []);
            const closed = publishStatus(api, fx, { fake: fakeGh({ head: { sha: headOf(fx.repoA) }, state: 'closed' }) });
            assert.match(closed.result.reason, /is not open/);
            const otherBase = publishStatus(api, fx, { base: 'feature' });
            assert.match(otherBase.result.reason, /--base must name the pull request's base branch main/, 'the branch itself would measure no diff');
            assert.equal(publishStatus(api, fx, { base: 'main' }).result.status, 'PUBLISHED', 'the PR base by name is fine');
            const broken = () => api.publishReviewStatus({ repository: fx.repoA, storeDir: fx.store, pr: 7, reviewStatus: STATUS_ON,
                reviewGateMode: 'off', gh: () => { throw Object.assign(new Error('exit 1'), { stderr: 'HTTP 404: Not Found' }); } });
            assert.throws(broken, /Resolving the GitHub repository failed .*HTTP 404/, 'a gh failure is reported, never read as success');
        })
    },
    {
        name: 'TC-RGE-020 a committed review bypass publishes only when its trailers are exact: PR, parent, unchanged tree, reason, final block',
        skip: !GIT,
        fn: async () => fixture(fx => {
            const api = receipt();
            const attempt = (setup, label) => {
                fs.rmSync(fx.repoA, { recursive: true, force: true });
                fs.mkdirSync(fx.repoA);
                makeStatusRepo(fx.repoA);
                setup();
                return publishStatus(api, fx).result;
            };
            const valid = attempt(() => commitBypass(fx.repoA), 'valid');
            assert.equal(valid.status, 'PUBLISHED', valid.reason);
            assert.equal(valid.via, 'bypass');
            assert.equal(valid.description, `skipped review: ${BYPASS_REASON}`);
            const refusals = [
                [() => commitBypass(fx.repoA, { pr: '8' }), /Review-Bypass-PR is 8, not pull request 7/, 'another pull request'],
                [() => commitBypass(fx.repoA, { parent: git(fx.repoA, ['rev-parse', 'HEAD~1']).trim() }), /is not the commit's parent/, 'a parent that is not the real one'],
                [() => commitBypass(fx.repoA, { parent: headOf(fx.repoA).slice(0, 12) }), /use the full SHA/, 'an abbreviated parent'],
                [() => commitBypass(fx.repoA, { changeFile: true }), /changes files/, 'a bypass that changes the tree'],
                [() => commitBypass(fx.repoA, { reason: 'too short' }), /10-500 printable characters \(got 9\)/, 'a short reason'],
                [() => commitBypass(fx.repoA, { reason: 'r'.repeat(501) }), /got 501/, 'a reason over 500 characters'],
                [() => commitBypass(fx.repoA, { lines: ['Review-Bypass: true', `Review-Bypass-Reason: ${BYPASS_REASON}`, 'Review-Bypass-PR: 7',
                    `Review-Bypass-Parent: ${headOf(fx.repoA)}`, 'Review-Bypass-PR: 7'] }), /exactly one Review-Bypass-PR trailer \(found 2\)/, 'a repeated trailer'],
                [() => commitBypass(fx.repoA, { lines: ['Review-Bypass: yes', `Review-Bypass-Reason: ${BYPASS_REASON}`, 'Review-Bypass-PR: 7',
                    `Review-Bypass-Parent: ${headOf(fx.repoA)}`] }), /must be true/, 'a marker that is not true'],
                [() => commitBypass(fx.repoA, { after: 'Generated with an assistant.' }), /not in the message's final trailer block/, 'trailers followed by an attribution paragraph'],
                [() => { commitBypass(fx.repoA); git(fx.repoA, [C_ARG, '-q', '--allow-empty', '-m', 'later work']); }, /no review receipt matches/, 'a bypass that is not the latest commit']
            ];
            for (const [setup, pattern, label] of refusals) {
                const result = attempt(setup, label);
                assert.equal(result.status, 'REFUSED', `${label}: refused`);
                assert.match(result.reason, pattern, label);
            }
        })
    },
    {
        name: 'TC-RGE-021 attestation is required only when requireAttestation is set or reviewGate.mode is enforce',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeStatusRepo(fx.repoA);
            const api = receipt();
            const head = snapshot(api, fx.repoA, 'branch', { base: 'main', committed: true });
            issueCandidate(api, fx.store, head, 'changes-review', { reviewGateMode: 'off' });
            const attested = { ...STATUS_ON, requireAttestation: true };
            assert.equal(publishStatus(api, fx).result.status, 'PUBLISHED', 'default: hooks are not needed, an unattested receipt counts');
            const refused = publishStatus(api, fx, { reviewStatus: attested }).result;
            assert.match(refused.reason, /no attested review receipt matches/, 'requireAttestation: an unattested receipt does not count');
            assert.equal(publishStatus(api, fx, { reviewGateMode: 'enforce' }).result.status, 'REFUSED',
                'enforce never accepts a receipt its own gate would refuse');
            withStore(fx.store, () => {
                const fresh = snapshot(api, fx.repoA, 'branch', { base: 'main', committed: true });
                api.recordAttestation({ repository: fx.repoA, kind: 'changes-review', now: fresh.capturedAt - 1 });
                issueCandidate(api, fx.store, fresh, 'changes-review', { reviewGateMode: 'enforce' });
            });
            assert.equal(publishStatus(api, fx, { reviewStatus: attested }).result.status, 'PUBLISHED', 'an attested receipt counts');
        })
    },
    {
        name: 'TC-RGE-022 the status description never exceeds 140 characters',
        skip: !GIT,
        fn: async () => fixture(fx => {
            makeStatusRepo(fx.repoA);
            const api = receipt();
            commitBypass(fx.repoA, { reason: `${'long reason '.repeat(41)}end`.trim() });
            const { result, fake } = publishStatus(api, fx);
            assert.equal(result.status, 'PUBLISHED', result.reason);
            assert.equal(result.description.length, 140);
            assert.match(result.description, /^skipped review: long reason .*\.\.\.$/);
            assert.equal(fake.posts()[0].at(-1), `description=${result.description}`, 'the capped text is what gh posts');
        })
    },
    {
        name: 'TC-RGE-023 reviewGate.status reads from the project config only, rejects invalid values, and shows in the schema, catalog and CLI',
        skip: !GIT,
        fn: async () => fixture(fx => {
            const policy = require(path.resolve(__dirname, '../../../scripts/lib/commit-review-policy.cjs'));
            const features = require(path.resolve(__dirname, '../../../scripts/framework-features.cjs'));
            const { SCHEMA } = require(path.resolve(__dirname, '../../lib/project-config-schema.cjs'));
            assert.deepEqual(Object.keys(SCHEMA.reviewGate.properties.status.properties), ['enabled', 'context', 'requireAttestation']);
            fs.mkdirSync(path.join(fx.repoB, 'docs'));
            const config = path.join(fx.repoB, 'docs', 'project-config.json');
            const read = () => policy.resolveReviewStatus({ rootDir: fx.repoB });
            assert.deepEqual(read(), { enabled: false, context: 'Review validation', requireAttestation: false, source: 'default' });
            fs.writeFileSync(config, '{ not json');
            assert.equal(read().enabled, false, 'an unreadable config publishes nothing');
            for (const bad of [{ status: true }, { status: { enabled: 'yes' } }, { status: { requireAttestation: 1 } }, { status: { context: '' } },
                { status: { context: 'x'.repeat(101) } }, { status: { context: ' padded' } }]) {
                fs.writeFileSync(config, JSON.stringify({ reviewGate: bad }));
                assert.throws(read, /Invalid reviewGate/, JSON.stringify(bad));
            }
            fs.writeFileSync(config, JSON.stringify({ reviewGate: { status: { enabled: true, requireAttestation: true } } }));
            assert.deepEqual(read(), { enabled: true, context: 'Review validation', requireAttestation: true, source: 'project-config' });
            assert.equal(policy.resolveReviewGateMode({ rootDir: fx.repoB }).mode, 'off', 'a status alone does not turn the hook gate on');
            const row = features.catalog({ rootDir: fx.repoB, homeDir: fx.root, env: {} }).find(item => item.key === 'reviewGate.status');
            assert.deepEqual([row.value, row.source], ['on (Review validation, attested)', 'project-config']);

            makeStatusRepo(fx.repoA);
            const cli = args => spawnSync(process.execPath, [LIB, ...args], { cwd: fx.repoA, encoding: 'utf8', windowsHide: true,
                env: { ...process.env, CK_REVIEW_RECEIPT_STORE: fx.store } });
            const off = cli(['publish-status', '--pr=7']);
            assert.equal(off.status, 1, 'a refusal exits 1');
            assert.match(off.stderr, /Review status refused: reviewGate\.status\.enabled/);
            assert.equal(JSON.parse(off.stdout).status, 'REFUSED');
        })
    },
    {
        name: 'TC-RGE-024 isolated source mutants of the status rules are killed: head match, bypass PR, parent, tree, trailer block, attestation, cap',
        skip: !GIT,
        fn: async () => fixture(fx => {
            const source = fs.readFileSync(LIB, 'utf8');
            const mutants = [
                ['head match', 'if (head !== localHead) {', 'if (false) {',
                    () => ({ fake: fakeGh({ head: { sha: git(fx.repoA, ['rev-parse', 'HEAD~1']).trim() } }) }), api => receiptForHead(api, fx)],
                ['bypass PR', "if (values['Review-Bypass-PR'] !== pr)", 'if (false)', () => ({}), () => commitBypass(fx.repoA, { pr: '8' })],
                ['bypass parent', "if (values['Review-Bypass-Parent'] !== parents[0]) {", 'if (false) {', () => ({}),
                    () => commitBypass(fx.repoA, { parent: git(fx.repoA, ['rev-parse', 'HEAD~1']).trim() })],
                ['unchanged tree', "if (run(['rev-parse', `${head}^{tree}`]).trim() !== run(['rev-parse', `${parents[0]}^{tree}`]).trim()) {", 'if (false) {',
                    () => ({}), () => commitBypass(fx.repoA, { changeFile: true })],
                ['trailer block', "'--format=%(trailers:only,unfold)'", "'--format=%B'", () => ({}),
                    () => commitBypass(fx.repoA, { after: 'Generated with an assistant.' })],
                ['attestation', 'const attested = policy.requireAttestation === true ||', 'const attested = false &&',
                    () => ({ reviewStatus: { ...STATUS_ON, requireAttestation: true } }), api => receiptForHead(api, fx)],
                ['description cap', 'return text.length <= STATUS_DESCRIPTION_MAX ?', 'return true ?', () => ({}),
                    () => commitBypass(fx.repoA, { reason: 'r'.repeat(300) })]
            ];
            const tempDir = path.join(fx.root, 'mutants');
            fs.mkdirSync(tempDir);
            for (const [label, from, to, extra, setup] of mutants) {
                assert.equal(source.split(from).length, 2, `${label}: the mutated rule occurs exactly once`);
                const file = path.join(tempDir, `mutant-${label.replace(/\W+/g, '-')}.cjs`);
                fs.writeFileSync(file, source.replace(from, () => to));
                delete require.cache[file];
                const mutant = require(file);
                const verdict = api => {
                    fs.rmSync(fx.repoA, { recursive: true, force: true });
                    fs.rmSync(fx.store, { recursive: true, force: true });
                    fs.mkdirSync(fx.repoA);
                    fs.mkdirSync(fx.store);
                    makeStatusRepo(fx.repoA);
                    setup(api);
                    const { result } = publishStatus(api, fx, extra());
                    return label === 'description cap' ? result.description.length <= 140 : result.status === 'REFUSED';
                };
                assert.equal(verdict(receipt()), true, `${label}: the real rule holds`);
                assert.equal(verdict(mutant), false, `${label}: the test fails against the mutant`);
            }
        })
    }
];

tests.push(...ENFORCE_TESTS, ...STATUS_TESTS);

module.exports = { name: 'review-commit-gate', tests };
