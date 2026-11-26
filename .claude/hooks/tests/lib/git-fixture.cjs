'use strict';

// Test-only environment ownership. Never use this scrubber in a production host launcher:
// receipt capture must classify the host's real Git context before creating its own children.
const os = require('node:os');
const path = require('node:path');
const { childEnv } = require('./hook-runner.cjs');
const { createEnvSaver } = require('./test-utils.cjs');

function cleanGitEnvironment(base = process.env) {
    return Object.fromEntries(Object.entries(base).filter(([key]) => !/^GIT_/i.test(key)));
}

// Homes, config and temp all belong to the caller's unique fixture root. Overrides are applied
// last, so a test can deliberately select a feature switch or inject a complete synthetic vector.
function fixtureEnvironment(root, overrides = {}) {
    const env = cleanGitEnvironment();
    for (const key of Object.keys(env)) {
        if (/^(CK_|CLAUDE_|CODEX_|OPENCODE_|TELEGRAM_|DISCORD_|SLACK_|ENABLE_|NODE_OPTIONS$)/i.test(key) || /TOKEN|SECRET|API_KEY/i.test(key)) {
            delete env[key];
        }
    }
    return childEnv({ HOME: root, USERPROFILE: root, XDG_CONFIG_HOME: path.join(root, 'xdg'), TMPDIR: root, TEMP: root, TMP: root, ...overrides }, env);
}

// Raw fixture setup only. These controls intentionally do NOT appear in the clean process env:
// receipt capture rejects config-file redirects even when the target happens to be a null device.
function fixtureGitEnvironment(base = process.env) {
    return childEnv({ GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: os.devNull, GIT_TERMINAL_PROMPT: '0' }, cleanGitEnvironment(base));
}

// The suites using this scope run sequentially. Save the complete environment so callback-added
// keys, removed keys, nested scopes and async failures restore the exact parent's state.
function withGitEnvironment(overrides, fn) {
    const savedKeys = Object.keys(process.env);
    const saver = createEnvSaver();
    saver.save(savedKeys);
    const restore = () => {
        for (const key of Object.keys(process.env)) delete process.env[key];
        saver.restore();
    };
    try {
        const env = childEnv(overrides, cleanGitEnvironment());
        for (const key of Object.keys(process.env)) delete process.env[key];
        Object.assign(process.env, env);
        const result = fn();
        if (result && typeof result.then === 'function') return Promise.resolve(result).finally(restore);
        restore();
        return result;
    } catch (error) {
        restore();
        throw error;
    }
}

function withFixtureEnvironment(root, overrides, fn) {
    const env = fixtureEnvironment(root, overrides);
    return withGitEnvironment({}, () => {
        for (const key of Object.keys(process.env)) delete process.env[key];
        Object.assign(process.env, env);
        return fn();
    });
}

module.exports = { cleanGitEnvironment, fixtureEnvironment, fixtureGitEnvironment, withGitEnvironment, withFixtureEnvironment };
