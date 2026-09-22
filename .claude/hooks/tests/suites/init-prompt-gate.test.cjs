/**
 * init-prompt-gate — UserPromptSubmit project-context router.
 *
 * The gate resolves the OPTIONAL project config through `portability.projectConfigPath`, so a
 * project that relocates its config must be evaluated AT that path. The portability contract:
 * a valid custom-path config does not block; an ABSENT config does not block either (it is a
 * supported state) but the notice must NAME the configured path, never the default; only a
 * config that EXISTS and does not validate blocks, because its author declared it authoritative.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { runHook, getHookPath } = require('../lib/hook-runner.cjs');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');

const GATE = getHookPath('init-prompt-gate.cjs');
const CUSTOM = 'config/project-config.json';

function write(dir, rel, content) {
    const target = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf8');
}

function isBlocked(stdout) {
    return /"decision"\s*:\s*"block"/.test(stdout);
}

module.exports = {
    name: 'init-prompt-gate',
    tests: [
        {
            name: '[init-prompt-gate] a valid custom portability.projectConfigPath does not block',
            fn: async () => {
                const dir = createTempDir();
                try {
                    write(dir, '.claude/.ck.json', { portability: { projectConfigPath: CUSTOM } });
                    write(dir, CUSTOM, { schemaVersion: 2, project: { name: 'Custom Path Gate' } });
                    // No config at the default path — the gate must validate the configured one only.
                    assertTrue(!fs.existsSync(path.join(dir, 'docs', 'project-config.json')), 'no default config present');

                    const result = await runHook(GATE, { prompt: 'do normal work' }, { cwd: dir });
                    assertEqual(result.code, 0, `the gate must never block the caller. stderr: ${result.stderr}`);
                    assertTrue(!isBlocked(result.stdout), `a valid custom-path config must not block. Got: ${result.stdout}`);
                } finally {
                    cleanupTempDir(dir);
                }
            }
        },
        {
            // PORTABILITY INVARIANT: an adopter who drops `.claude` into a repo with no project
            // config must still be able to ask for anything. A missing config is a supported
            // state — the gate notices it and names the configured path, and never blocks.
            name: '[init-prompt-gate] a missing config does NOT block and names the configured path',
            fn: async () => {
                const dir = createTempDir();
                try {
                    write(dir, '.claude/.ck.json', { portability: { projectConfigPath: CUSTOM } });
                    // The configured config is absent; the default path is irrelevant.
                    const result = await runHook(GATE, { prompt: 'do normal work' }, { cwd: dir });
                    assertEqual(result.code, 0);
                    assertTrue(
                        !isBlocked(result.stdout),
                        `a missing config must never block the prompt. Got: ${result.stdout}`
                    );
                    assertTrue(
                        result.stdout.includes(CUSTOM),
                        `the notice must name the CONFIGURED path (${CUSTOM}). Got: ${result.stdout}`
                    );
                } finally {
                    cleanupTempDir(dir);
                }
            }
        },
        {
            // The bare-adopter case: `.claude` dropped into a repo with no `.ck.json` and no
            // config at the default path. Ordinary work must proceed on portable defaults.
            name: '[init-prompt-gate] a no-config project runs ordinary work on portable defaults',
            fn: async () => {
                const dir = createTempDir();
                try {
                    // No .ck.json, no docs/project-config.json — a bare adopter checkout.
                    const result = await runHook(GATE, { prompt: 'add a login button' }, { cwd: dir });
                    assertEqual(result.code, 0);
                    assertTrue(
                        !isBlocked(result.stdout),
                        `a bare adopter project must not be gated. Got: ${result.stdout}`
                    );
                } finally {
                    cleanupTempDir(dir);
                }
            }
        },
        {
            // The complement of the two cases above: a config the author DID write, which does
            // not validate, must NOT be silently replaced by portable defaults.
            name: '[init-prompt-gate] an invalid custom-path config blocks with its schema errors',
            fn: async () => {
                const dir = createTempDir();
                try {
                    write(dir, '.claude/.ck.json', { portability: { projectConfigPath: CUSTOM } });
                    // `project.name` is required and empty → invalid, not missing.
                    write(dir, CUSTOM, { schemaVersion: 2, project: { name: '' } });
                    const result = await runHook(GATE, { prompt: 'do normal work' }, { cwd: dir });
                    assertEqual(result.code, 0);
                    assertTrue(isBlocked(result.stdout), `an invalid custom-path config must block. Got: ${result.stdout}`);
                    assertTrue(result.stdout.includes(CUSTOM), 'the block reason names the configured path');
                } finally {
                    cleanupTempDir(dir);
                }
            }
        }
    ]
};
