/**
 * Standalone Test Script Suite (wrapper)
 *
 * `run-all-tests.cjs` discovers ONLY `suites/*.test.cjs`. Every other test
 * script under `tests/` is therefore invisible to the regression battery: it
 * passes or rots entirely unobserved, and a change that breaks it produces a
 * fully green `run-all-tests` run. That is the worst failure a test suite can
 * have — it reports safety it is not providing.
 *
 * This wrapper closes the gap for every standalone script that (a) carries
 * coverage no `suites/*` file duplicates, and (b) confines its writes to
 * temporary directories. It intentionally owns no assertions of its own: each
 * script keeps its logic and its non-zero exit on failure, and this file only
 * makes that exit visible to the battery. Adding a script here is the wiring;
 * fixing what it asserts stays in the script.
 *
 * DELIBERATELY NOT WIRED — these mutate real repository files and would make
 * the battery destructive if a run crashed mid-test, so they stay manual:
 *   - `test-init-reference-docs.cjs`  → backs up and rewrites `docs/project-config.json`
 *   - `test-ckignore.js`              → backs up and rewrites `.claude/.ckignore`
 * `test-ckignore.js` and `test-modularization-hook.js` are additionally RED:
 * both target files deleted in an earlier refactor (`scout-block/scout-block.sh`
 * and `hooks/modularization-hook.js`), so they assert against implementations
 * that no longer exist. They are left in place, unwired and reported, rather
 * than deleted here — both are registered in `.claude/metadata.json`, so
 * removing them is an install-manifest change for the owner to make.
 *
 * `test-doc-sync-gate.cjs` has its own wrapper (`doc-sync-gate.test.cjs`) and
 * `test-privacy-block.js` is already spawned by `privacy-operands.test.cjs`;
 * neither is repeated here.
 */

const path = require('path');
const { spawn } = require('child_process');

const TESTS_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// Scripts run from the repository root: that is the cwd the project's own
// documentation uses to invoke them, and at least one script resolves project
// paths relative to cwd, so running it from anywhere else exercises a
// different code path than the documented one.
const SCRIPTS = [
    ['test-git-commit-block.cjs', 'git authority policy, lease scoping, GitHub CLI publish gate, classifier mutants'],
    ['test-lib-modules.cjs', 'core lib module contracts'],
    ['test-lib-modules-extended.cjs', 'extended lib module contracts and project-root detection'],
    ['test-shared-utilities.cjs', 'shared hook utilities and swap-directory ownership'],
    ['test-swap-engine.cjs', 'external-memory swap engine and session-end cleanup'],
    ['test-scout-block.js', 'scout-block ckignore pattern matching'],
    ['test-path-boundary-block.js', 'path-boundary hook end-to-end decisions']
];

// Every sibling suite that spawns a child bounds it; this one did not, so a
// single hung script stalled the whole battery indefinitely with no diagnostic
// — the worst failure mode for a gate, because it produces no verdict at all.
//
// The bound is MEASURED, not guessed. All seven scripts are spawned together, so
// each competes with six peers. On this Windows checkout:
//   test-git-commit-block.cjs   88.2s solo -> 125.5s under 7-way contention (+43%)
//   test-path-boundary-block.js 48.5s solo ->  57.9s
//   test-scout-block.js         23.4s solo ->  23.5s
// The slowest script legitimately needs over two minutes here, so a 120s bound
// killed working work. 300s clears the measured worst case ~2.4x — enough headroom
// for a slower machine — while still converting an unbounded hang into a NAMED
// failure. Raise this only with a new measurement, never to chase a red run.
const SCRIPT_TIMEOUT_MS = 300_000;

function runScript(script) {
    return new Promise(resolve => {
        const proc = spawn(process.execPath, [path.join(TESTS_DIR, script)], {
            cwd: REPO_ROOT,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
        });
        let stdout = '';
        let stderr = '';
        let settled = false;
        const finish = result => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(result);
        };
        const timer = setTimeout(() => {
            proc.kill('SIGKILL');
            finish({
                code: 1,
                stdout,
                stderr: `${stderr}\n[standalone] TIMEOUT after ${SCRIPT_TIMEOUT_MS}ms — ${script} was killed`
            });
        }, SCRIPT_TIMEOUT_MS);
        timer.unref?.();
        proc.stdout.on('data', chunk => (stdout += chunk.toString()));
        proc.stderr.on('data', chunk => (stderr += chunk.toString()));
        proc.on('close', code => finish({ code, stdout, stderr }));
        proc.on('error', error => finish({ code: 1, stdout, stderr: String(error) }));
    });
}

const tests = SCRIPTS.map(([script, coverage]) => ({
    name: `[standalone] ${script} passes (${coverage})`,
    fn: async () => {
        const { code, stdout, stderr } = await runScript(script);
        if (code !== 0) {
            const failures = stdout
                .split('\n')
                .filter(line => /\[FAIL\]|✗|✘|Assertion failed|FAILED/.test(line))
                .slice(0, 20)
                .join('\n');
            throw new Error(
                `${script} exited ${code}\n${failures || stdout.slice(-1200)}` +
                    (stderr ? `\nstderr: ${stderr.slice(-500)}` : '')
            );
        }
    }
}));

module.exports = {
    name: 'standalone-scripts',
    tests
};
