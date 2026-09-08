'use strict';

/**
 * GitHub MCP publish-authority gate.
 *
 * The Bash gate (git-commit-block.cjs) covers `git push` and the GitHub CLI.
 * These tests cover the THIRD path to the same remote effects: the GitHub MCP
 * server, which publishes without a shell. Each case asserts the decision AND,
 * for blocks, that the message names the MCP tool rather than a git command
 * that never ran.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { issueLease, revokeLease } = require('../../lib/git-operation-lease.cjs');
const { remoteSlug, isReadAction, repositorySlugs } = require('../../github-mcp-write-block.cjs');

const HOOK = path.resolve(__dirname, '../../github-mcp-write-block.cjs');

function withFixture(fn, { remoteUrl = 'https://github.com/acme/widgets.git', extraConfig = '' } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-mcp-test-'));
    const repo = path.join(root, 'repo');
    const store = path.join(root, 'leases');
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
    fs.mkdirSync(store);
    fs.writeFileSync(
        path.join(repo, '.git', 'config'),
        `[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = ${remoteUrl}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n${extraConfig}`
    );
    const session = `session-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    try {
        return fn({ root, repo, store, session });
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

function runHook(toolName, toolInput, f, sessionId = f => f.session) {
    return spawnSync(process.execPath, [HOOK], {
        env: {
            ...process.env,
            GIT_DIR: undefined,
            GIT_WORK_TREE: undefined,
            GIT_COMMON_DIR: undefined,
            CLAUDE_PROJECT_DIR: f.repo,
            CK_GIT_LEASE_STORE: f.store
        },
        input: JSON.stringify({
            tool_name: toolName,
            session_id: typeof sessionId === 'function' ? sessionId(f) : sessionId,
            cwd: f.repo,
            tool_input: toolInput
        }),
        encoding: 'utf8',
        timeout: 10000
    });
}

const READ_TOOLS = [
    ['mcp__github__get_file_contents', { owner: 'acme', repo: 'widgets', path: 'README.md' }],
    ['mcp__github__get_issue', { owner: 'acme', repo: 'widgets', issue_number: 1 }],
    ['mcp__github__get_pull_request', { owner: 'acme', repo: 'widgets', pullNumber: 1 }],
    ['mcp__github__get_pull_request_comments', { owner: 'acme', repo: 'widgets', pullNumber: 1 }],
    ['mcp__github__get_pull_request_files', { owner: 'acme', repo: 'widgets', pullNumber: 1 }],
    ['mcp__github__get_pull_request_reviews', { owner: 'acme', repo: 'widgets', pullNumber: 1 }],
    ['mcp__github__get_pull_request_status', { owner: 'acme', repo: 'widgets', pullNumber: 1 }],
    ['mcp__github__list_commits', { owner: 'acme', repo: 'widgets' }],
    ['mcp__github__list_issues', { owner: 'acme', repo: 'widgets' }],
    ['mcp__github__list_pull_requests', { owner: 'acme', repo: 'widgets' }],
    ['mcp__github__search_code', { q: 'foo' }],
    ['mcp__github__search_issues', { q: 'foo' }],
    ['mcp__github__search_repositories', { query: 'foo' }],
    ['mcp__github__search_users', { q: 'foo' }]
];

// Every mutating tool the GitHub MCP server currently exposes.
const WRITE_TOOLS = [
    ['mcp__github__merge_pull_request', { owner: 'acme', repo: 'widgets', pullNumber: 7 }],
    ['mcp__github__create_pull_request', { owner: 'acme', repo: 'widgets', title: 't', head: 'a', base: 'b' }],
    ['mcp__github__create_pull_request_review', { owner: 'acme', repo: 'widgets', pullNumber: 7, event: 'APPROVE' }],
    ['mcp__github__update_pull_request_branch', { owner: 'acme', repo: 'widgets', pullNumber: 7 }],
    ['mcp__github__create_or_update_file', { owner: 'acme', repo: 'widgets', path: 'a.txt', content: 'x', message: 'm', branch: 'main' }],
    ['mcp__github__push_files', { owner: 'acme', repo: 'widgets', branch: 'main', files: [], message: 'm' }],
    ['mcp__github__create_branch', { owner: 'acme', repo: 'widgets', branch: 'topic' }],
    ['mcp__github__create_issue', { owner: 'acme', repo: 'widgets', title: 't' }],
    ['mcp__github__update_issue', { owner: 'acme', repo: 'widgets', issue_number: 1 }],
    ['mcp__github__add_issue_comment', { owner: 'acme', repo: 'widgets', issue_number: 1, body: 'b' }],
    ['mcp__github__create_repository', { name: 'brand-new' }]
];

// Writes that a push lease must NEVER authorize, because they bring a NEW
// repository into existence rather than writing to the leased one. Listed
// literally, NOT derived from the hook's own predicate — a test that asks the
// implementation what it does can only ever agree with it.
//
// `fork_repository` is the interesting member: its schema DOES carry owner/repo
// (the repo being forked), so it took the ordinary leaseable path and rode a push
// lease for the source repository, while creating a repository somewhere the gate
// never inspects.
const UNLEASEABLE_WRITES = [
    ['mcp__github__fork_repository', { owner: 'acme', repo: 'widgets' }],
    ['mcp__github__create_repository', { name: 'brand-new' }]
];

const tests = [
    {
        name: 'GitHub MCP reads are never gated',
        fn() {
            withFixture(f => {
                for (const [tool, input] of READ_TOOLS) {
                    const result = runHook(tool, input, f);
                    assert.equal(result.status, 0, `${tool}: ${result.stderr}`);
                }
            });
        }
    },
    {
        name: 'GitHub MCP writes are blocked without a push lease',
        fn() {
            withFixture(f => {
                for (const [tool, input] of WRITE_TOOLS) {
                    const result = runHook(tool, input, f);
                    assert.equal(result.status, 2, `${tool} was not blocked`);
                    assert.match(result.stderr, /GitHub MCP/, tool);
                }
            });
        }
    },
    {
        name: 'a push lease for the same repository authorizes a repo-scoped MCP write',
        fn() {
            withFixture(f => {
                const lease = issueLease({
                    projectDir: f.repo,
                    repository: f.repo,
                    sessionId: f.session,
                    operations: ['push'],
                    sourceRequest: 'user asked to merge the PR',
                    storeDir: f.store
                });
                for (const [tool, input] of WRITE_TOOLS) {
                    const result = runHook(tool, input, f);
                    // `create_repository` names no existing owner/repo, so no
                    // lease scoped to a local checkout can cover it.
                    const leaseable = typeof input.owner === 'string';
                    assert.equal(
                        result.status,
                        leaseable ? 0 : 2,
                        `${tool} expected ${leaseable ? 'ALLOW' : 'BLOCK'}: ${result.stderr}`
                    );
                }
                revokeLease({ projectDir: f.repo, repository: f.repo, sessionId: f.session, leaseId: lease.leaseId, storeDir: f.store });
                const after = runHook('mcp__github__merge_pull_request', { owner: 'acme', repo: 'widgets', pullNumber: 7 }, f);
                assert.equal(after.status, 2, 'a revoked lease must stop authorizing writes');
            });
        }
    },
    {
        name: 'a lease cannot cover a repository this session is not working in',
        fn() {
            withFixture(f => {
                issueLease({
                    projectDir: f.repo,
                    repository: f.repo,
                    sessionId: f.session,
                    operations: ['push'],
                    sourceRequest: 'user asked to merge the PR',
                    storeDir: f.store
                });
                const foreign = runHook('mcp__github__merge_pull_request', { owner: 'other', repo: 'thing', pullNumber: 1 }, f);
                assert.equal(foreign.status, 2, 'a foreign owner/repo must not ride the local lease');
                assert.match(foreign.stderr, /authorizes only acme\/widgets/);

                // Every repository-creating write is refused even WITH a live push
                // lease for this checkout, and each is named explicitly.
                for (const [tool, input] of UNLEASEABLE_WRITES) {
                    const result = runHook(tool, input, f);
                    assert.equal(result.status, 2, `${tool} must never ride a push lease`);
                }
                assert.match(
                    runHook('mcp__github__fork_repository', { owner: 'acme', repo: 'widgets' }, f).stderr,
                    /creates a NEW repository/
                );
                assert.match(
                    runHook('mcp__github__create_repository', { name: 'brand-new' }, f).stderr,
                    /creates a NEW repository/
                );
            });
        }
    },
    {
        // A push lease records project + session + repository — never a remote —
        // and the push it stands for goes to `origin`. Authorizing every remote in
        // .git/config therefore granted more than the lease represents: a lease for
        // your FORK also authorized merge_pull_request against the upstream you
        // merely track. Submodule urls and insteadOf rewrite rules were swept in
        // too, because the scan matched any `url =` line regardless of section.
        name: 'a push lease authorizes only the origin remote, not every configured url',
        fn() {
            const extraConfig = [
                '[remote "upstream"]',
                '\turl = https://github.com/upstream-org/widgets.git',
                '\tfetch = +refs/heads/*:refs/remotes/upstream/*',
                '[submodule "vendor/lib"]',
                '\turl = https://github.com/vendor/lib.git',
                '[url "https://github.com/mirror/widgets.git"]',
                '\tinsteadOf = https://github.com/acme/widgets.git',
                ''
            ].join('\n');
            withFixture(f => {
                issueLease({
                    projectDir: f.repo,
                    repository: f.repo,
                    sessionId: f.session,
                    operations: ['push'],
                    sourceRequest: 'user asked to merge the PR',
                    storeDir: f.store
                });
                assert.equal(
                    runHook('mcp__github__merge_pull_request', { owner: 'acme', repo: 'widgets', pullNumber: 1 }, f).status,
                    0,
                    'the origin remote the lease was minted for stays authorized'
                );
                for (const [owner, repo] of [['upstream-org', 'widgets'], ['vendor', 'lib'], ['mirror', 'widgets']]) {
                    const result = runHook('mcp__github__merge_pull_request', { owner, repo, pullNumber: 1 }, f);
                    assert.equal(result.status, 2, `${owner}/${repo} must not ride the origin lease`);
                    assert.match(result.stderr, /authorizes only acme\/widgets/);
                }
            }, { extraConfig });
        }
    },
    {
        // The gate must judge the caller against the harness's cwd, never one the
        // caller supplied. Preferring a model-authored tool_input.cwd let the write
        // choose which repository it would be measured against.
        name: 'a model-authored tool_input.cwd cannot re-point the gate',
        fn() {
            withFixture(f => {
                issueLease({
                    projectDir: f.repo,
                    repository: f.repo,
                    sessionId: f.session,
                    operations: ['push'],
                    sourceRequest: 'user asked to merge the PR',
                    storeDir: f.store
                });
                const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-mcp-other-'));
                try {
                    const result = runHook(
                        'mcp__github__merge_pull_request',
                        { owner: 'other', repo: 'thing', pullNumber: 1, cwd: elsewhere },
                        f
                    );
                    assert.equal(result.status, 2, 'a caller-supplied cwd must not select the judging repository');
                } finally {
                    fs.rmSync(elsewhere, { recursive: true, force: true });
                }
            });
        }
    },
    {
        name: 'a lease issued to another session grants nothing',
        fn() {
            withFixture(f => {
                issueLease({
                    projectDir: f.repo,
                    repository: f.repo,
                    sessionId: f.session,
                    operations: ['push'],
                    sourceRequest: 'user asked to merge the PR',
                    storeDir: f.store
                });
                const other = runHook('mcp__github__merge_pull_request', { owner: 'acme', repo: 'widgets', pullNumber: 7 }, f, 'a-different-session');
                assert.equal(other.status, 2, 'a lease is session-scoped');
                const none = runHook('mcp__github__merge_pull_request', { owner: 'acme', repo: 'widgets', pullNumber: 7 }, f, '');
                assert.equal(none.status, 2, 'no session identity means no authority');
            });
        }
    },
    {
        name: 'an add/commit lease does not authorize a publish',
        fn() {
            withFixture(f => {
                issueLease({
                    projectDir: f.repo,
                    repository: f.repo,
                    sessionId: f.session,
                    operations: ['add', 'commit'],
                    sourceRequest: 'user asked to stage and commit',
                    storeDir: f.store
                });
                const result = runHook('mcp__github__merge_pull_request', { owner: 'acme', repo: 'widgets', pullNumber: 7 }, f);
                assert.equal(result.status, 2, 'MCP writes consume a push lease, not a commit lease');
            });
        }
    },
    {
        name: 'events for other tools pass straight through',
        fn() {
            withFixture(f => {
                for (const tool of ['Bash', 'Read', 'mcp__filesystem__read_file', 'mcp__githubx__merge_pull_request']) {
                    const result = runHook(tool, { command: 'git push' }, f);
                    assert.equal(result.status, 0, `${tool} is outside this hook's matcher: ${result.stderr}`);
                }
            });
        }
    },
    {
        name: 'remote URL spellings normalize to the same owner/repo',
        fn() {
            for (const url of [
                'https://github.com/Acme/Widgets.git',
                'https://github.com/acme/widgets',
                'git@github.com:acme/widgets.git',
                'ssh://git@github.com/acme/widgets.git',
                'https://user:token@github.com/acme/widgets.git'
            ]) {
                assert.equal(remoteSlug(url), 'acme/widgets', url);
            }
            for (const url of ['https://gitlab.com/acme/widgets.git', 'not a url', '', null, 'https://github.com/acme']) {
                assert.equal(remoteSlug(url), null, String(url));
            }
        }
    },
    {
        name: 'unmodeled MCP verbs are treated as writes (fail-closed)',
        fn() {
            assert.equal(isReadAction('get_issue'), true);
            assert.equal(isReadAction('list_commits'), true);
            assert.equal(isReadAction('search_code'), true);
            for (const action of ['delete_release', 'transfer_repository', 'dispatch_workflow', 'merge_pull_request']) {
                assert.equal(isReadAction(action), false, action);
            }
            withFixture(f => {
                const result = runHook('mcp__github__delete_release', { owner: 'acme', repo: 'widgets', tag: 'v1' }, f);
                assert.equal(result.status, 2, 'a verb this hook does not model must not walk through');
            });
        }
    },
    {
        // A linked worktree's gitdir holds no `config` — remotes live in the
        // common directory it points at. Without following `commondir` the gate
        // finds no remotes and denies a write the lease actually covers.
        name: 'a linked worktree resolves its remotes through commondir',
        fn() {
            withFixture(f => {
                const worktree = path.join(f.root, 'wt');
                const linked = path.join(f.repo, '.git', 'worktrees', 'wt');
                fs.mkdirSync(linked, { recursive: true });
                fs.mkdirSync(worktree, { recursive: true });
                fs.writeFileSync(path.join(linked, 'commondir'), '../..\n');
                fs.writeFileSync(path.join(worktree, '.git'), `gitdir: ${linked}\n`);

                assert.deepEqual([...repositorySlugs(worktree)], ['acme/widgets']);

                issueLease({
                    projectDir: f.repo,
                    repository: worktree,
                    sessionId: f.session,
                    operations: ['push'],
                    sourceRequest: 'user asked to merge the PR',
                    storeDir: f.store
                });
                const result = spawnSync(process.execPath, [HOOK], {
                    env: {
                        ...process.env,
                        GIT_DIR: undefined,
                        GIT_WORK_TREE: undefined,
                        GIT_COMMON_DIR: undefined,
                        CLAUDE_PROJECT_DIR: f.repo,
                        CK_GIT_LEASE_STORE: f.store
                    },
                    input: JSON.stringify({
                        tool_name: 'mcp__github__merge_pull_request',
                        session_id: f.session,
                        cwd: worktree,
                        tool_input: { owner: 'acme', repo: 'widgets', pullNumber: 7 }
                    }),
                    encoding: 'utf8',
                    timeout: 10000
                });
                assert.equal(result.status, 0, `worktree write should ride its lease: ${result.stderr}`);
            });
        }
    },
    {
        name: 'a repository with no GitHub remote cannot lease an MCP write',
        fn() {
            withFixture(f => {
                issueLease({
                    projectDir: f.repo,
                    repository: f.repo,
                    sessionId: f.session,
                    operations: ['push'],
                    sourceRequest: 'user asked to merge the PR',
                    storeDir: f.store
                });
                const result = runHook('mcp__github__merge_pull_request', { owner: 'acme', repo: 'widgets', pullNumber: 7 }, f);
                assert.equal(result.status, 2, 'a non-GitHub remote must not match a GitHub slug');
            }, { remoteUrl: 'https://gitlab.com/acme/widgets.git' });
        }
    }
];

module.exports = { name: 'github-mcp-write-block', tests };
