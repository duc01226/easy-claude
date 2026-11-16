'use strict';

/**
 * ck-path-utils — the canonical path-containment owners.
 *
 * Technical contract (no business Feature Spec governs this library):
 *   - `isAbsolutePathWithin(root, candidate)` is the ONE containment predicate for resolved
 *     filesystem paths behind traversal and symlink-escape guards. A candidate is inside only on
 *     a segment boundary; a different drive, a UNC share, a prefix-sharing sibling and a `..`
 *     result are outside; win32 folds case, POSIX does not. Semantics are pinned per platform
 *     through the injectable `pathApi`, so both hosts' rules are proven on every host.
 *   - Its adopters bind the shared export instead of carrying a private copy, so the security
 *     rule cannot drift between guards.
 *   - `escapesRepoRoot` treats a Windows drive-relative value (`C:foo`) as leaving the repo.
 */

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const pathUtils = require(path.join(REPO, '.claude', 'hooks', 'lib', 'ck-path-utils.cjs'));
const { isAbsolutePathWithin, escapesRepoRoot, sameFileIdentity } = pathUtils;

function expectCases(label, pathApi, cases) {
    for (const [root, candidate, expected] of cases) {
        assertEqual(
            isAbsolutePathWithin(root, candidate, pathApi),
            expected,
            `${label}: isAbsolutePathWithin(${JSON.stringify(root)}, ${JSON.stringify(candidate)})`
        );
    }
}

const tests = [
    {
        name: '[ck-path-utils] TC-CKPU-001 win32 containment is segment-bounded, case-folded and drive-aware',
        fn: () => {
            // Given: win32 path semantics and a repository root on drive C.
            // When: candidates inside, beside, above and on other volumes are tested.
            // Then: only the root and its descendants are inside, whatever their letter case.
            expectCases('win32', path.win32, [
                ['C:\\repo', 'C:\\repo', true],
                ['C:\\repo', 'C:\\repo\\docs\\x.md', true],
                ['C:\\repo\\', 'C:\\repo\\docs', true],
                ['C:\\repo', 'c:\\REPO\\Docs\\x.md', true],
                ['C:\\repo', 'C:\\repo\\..x\\file.md', true],
                ['C:\\repo', 'C:\\repo\\docs\\..\\..\\outside', false],
                ['C:\\repo', 'C:\\repo-sibling\\x.md', false],
                ['C:\\repo', 'C:\\', false],
                ['C:\\repo', 'D:\\repo\\x.md', false],
                ['C:\\repo', '\\\\server\\share\\repo\\x.md', false]
            ]);
        }
    },
    {
        name: '[ck-path-utils] TC-CKPU-002 POSIX containment is segment-bounded and case-sensitive',
        fn: () => {
            // Given: POSIX path semantics and a repository root.
            // When: candidates inside, beside, above and differing only in case are tested.
            // Then: only the root and its descendants are inside; a case variant is a different directory.
            expectCases('posix', path.posix, [
                ['/srv/repo', '/srv/repo', true],
                ['/srv/repo/', '/srv/repo/docs/x.md', true],
                ['/srv/repo', '/srv/repo/..x/file.md', true],
                ['/srv/repo', '/srv/repo/a/../../etc/passwd', false],
                ['/srv/repo', '/srv/repository/x.md', false],
                ['/srv/repo', '/srv', false],
                ['/srv/repo', '/SRV/REPO/x.md', false]
            ]);
        }
    },
    {
        name: '[ck-path-utils] TC-CKPU-003 invalid input is never inside',
        fn: () => {
            // Given: missing, non-string and NUL-bearing inputs. When: containment is asked.
            // Then: the guard fails closed instead of resolving an empty side against the cwd.
            const root = path.resolve(REPO);
            for (const [r, c] of [['', root], [root, ''], [undefined, root], [root, null], [root, 42], [root, `${root}${path.sep}a\0b`]]) {
                assertEqual(isAbsolutePathWithin(r, c), false, `invalid input must not be contained: ${JSON.stringify([r, c])}`);
            }
        }
    },
    {
        name: '[ck-path-utils] TC-CKPU-004 containment adopters bind the shared predicate instead of a private copy',
        fn: () => {
            // Given: the guards that check resolved-path containment for traversal or symlink escape.
            const adopters = [
                ['.claude/hooks/lib/project-reference-registry.cjs', /require\('\.\/ck-path-utils\.cjs'\)/],
                ['.claude/scripts/lib/workflow-baseline.cjs', /require\("\.\.\/\.\.\/hooks\/lib\/ck-path-utils\.cjs"\)/],
                ['.claude/scripts/doc-impact-map.cjs', /pathUtils && pathUtils\.isAbsolutePathWithin/]
            ];
            for (const [relativePath, bindingPattern] of adopters) {
                // When: each guard's source is read.
                const source = fs.readFileSync(path.join(REPO, ...relativePath.split('/')), 'utf8');
                // Then: it binds the canonical export and declares no standalone containment function.
                assertTrue(bindingPattern.test(source), `${relativePath} must bind ck-path-utils' isAbsolutePathWithin`);
                assertTrue(source.includes('isAbsolutePathWithin'), `${relativePath} must reference isAbsolutePathWithin`);
                assertTrue(
                    !/^function (isPathWithin|isWithin|isAbsolutePathWithin)\s*\(/m.test(source),
                    `${relativePath} must not declare a private containment function`
                );
            }
        }
    },
    {
        name: '[ck-path-utils] TC-CKPU-005 escapesRepoRoot treats a drive-relative value as leaving the repo',
        fn: () => {
            // Given: configured root values in drive-relative, drive-absolute and repo-relative forms.
            // When: the repo-root escape guard classifies them.
            // Then: any leading drive letter + colon escapes; a later colon inside a segment does not.
            for (const [value, expected] of [
                ['C:foo', true],
                ['c:foo/bar', true],
                ['C:', true],
                ['C:\\abs', true],
                ['C:/abs', true],
                ['docs/c:notes', false],
                ['docs/specs', false]
            ]) {
                assertEqual(escapesRepoRoot(value), expected, `escapesRepoRoot(${JSON.stringify(value)})`);
            }
        }
    },
    {
        name: '[ck-path-utils] TC-CKPU-006 sameFileIdentity compares exact 64-bit IDs and fails closed on Number stats',
        fn: () => {
            // Given: NTFS-sized file IDs, where a Number cannot tell an ID from the next one.
            const id = 2n ** 60n + 2n;
            assertTrue(Number(id) === Number(id + 1n), 'premise: the two IDs collide as Numbers');
            const stat = (dev, ino) => ({ dev, ino });
            // When / Then: bigint IDs compare exactly — equal only on the same device and the same ID.
            assertTrue(sameFileIdentity(stat(7n, id), stat(7n, id)), 'same device and ID is the same file');
            assertTrue(!sameFileIdentity(stat(7n, id), stat(7n, id + 1n)), 'IDs one apart above 2^53 are different files');
            assertTrue(!sameFileIdentity(stat(7n, id), stat(8n, id)), 'the same ID on another device is a different file');
            // Then: a Number-mode stat never proves identity, even when the Numbers are equal.
            assertTrue(!sameFileIdentity(stat(7, Number(id)), stat(7, Number(id))), 'Number stats fail closed');
            assertTrue(!sameFileIdentity(stat(7n, id), stat(7, Number(id))), 'a mixed pair fails closed');
            for (const missing of [null, undefined, {}]) assertTrue(!sameFileIdentity(missing, stat(7n, id)), `${JSON.stringify(missing)} is not a file`);
            // Then: real bigint stats of one file match, and of two files do not.
            fs.mkdirSync(path.join(REPO, 'tmp'), { recursive: true });
            const dir = fs.mkdtempSync(path.join(REPO, 'tmp', 'ckpu-identity-'));
            try {
                fs.writeFileSync(path.join(dir, 'a'), 'a'); fs.writeFileSync(path.join(dir, 'b'), 'b');
                const a = fs.statSync(path.join(dir, 'a'), { bigint: true });
                const fd = fs.openSync(path.join(dir, 'a'), 'r');
                try { assertTrue(sameFileIdentity(a, fs.fstatSync(fd, { bigint: true })), 'path and descriptor of one file match'); }
                finally { fs.closeSync(fd); }
                assertTrue(!sameFileIdentity(a, fs.statSync(path.join(dir, 'b'), { bigint: true })), 'two files differ');
            } finally { fs.rmSync(dir, { recursive: true, force: true }); }
        }
    },
    {
        name: '[ck-path-utils] TC-CKPU-007 file-identity guards bind sameFileIdentity and no source compares stat IDs itself',
        fn: () => {
            // Given: every shipped source under the hook, script and skill trees, tests excluded.
            const roots = ['.claude/hooks', '.claude/scripts', '.claude/skills'];
            const owner = path.join(REPO, '.claude', 'hooks', 'lib', 'ck-path-utils.cjs');
            // A `dev`/`ino` read (member, renamed field or destructured name) compared with another.
            const comparesStatIds = /(?:\.|\b)(?:ino|dev)\w*\s*[!=]==?\s*(?:[\w.]*\.(?:ino|dev)\w*|(?:ino|dev)\w*)\b/;
            for (const shape of ['opened.ino !== before.ino', 'stat.ino !== session.inode', 'stat.dev !== session.device', 'ino !== other.ino', 'a.dev===b.dev']) {
                assertTrue(comparesStatIds.test(shape), `the scan recognizes ${shape}`);
            }
            for (const shape of ['after.size !== before.size', 'a.ino !== 0n', 'sameFileIdentity(a, b)', "device === 'mobile'"]) {
                assertTrue(!comparesStatIds.test(shape), `the scan ignores ${shape}`);
            }
            const offenders = [];
            const visit = dir => {
                for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                    const full = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        if (!['node_modules', 'tests', '__tests__'].includes(entry.name)) visit(full);
                    } else if (/\.(c|m)?js$/.test(entry.name) && full !== owner) {
                        // When: a source compares `.ino` or `.dev` of one stat with another's.
                        const text = fs.readFileSync(full, 'utf8');
                        if (comparesStatIds.test(text)) offenders.push(path.relative(REPO, full));
                    }
                }
            };
            for (const root of roots) visit(path.join(REPO, ...root.split('/')));
            // Then: none does — Number-mode IDs collide above 2^53, so the shared bigint check is the only owner.
            assertEqual(offenders.join(', '), '', 'sources comparing stat IDs outside sameFileIdentity');
            for (const adopter of [
                '.claude/hooks/lib/convention-ledger.cjs',
                '.claude/hooks/lib/task-tracking-files.cjs',
                '.claude/hooks/lib/task-tracking-migration.cjs',
                '.claude/scripts/lib/context-evaluation-world.cjs',
                '.claude/scripts/lib/workflow-baseline.cjs',
                '.claude/skills/framework-benchmark/lib/worktrees.cjs'
            ]) {
                const source = fs.readFileSync(path.join(REPO, ...adopter.split('/')), 'utf8');
                assertTrue(/sameFileIdentity\b[^\n]*require\([^)]*ck-path-utils\.cjs/.test(source), `${adopter} must bind ck-path-utils' sameFileIdentity`);
                assertTrue(source.includes('{ bigint: true }'), `${adopter} must take bigint stats`);
            }
        }
    }
];

module.exports = { name: 'ck-path-utils', tests };
