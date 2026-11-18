#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import contract from './contract.cjs';

const { EVENTS, HOOK_TIMEOUT_SECONDS, record } = contract;
const BRIDGE_COMMAND = 'node ../.claude/scripts/antigravity/hook-bridge.cjs';
const GROUP = 'easy-claude';

function renderGroup(previous) {
    const group = {};
    if (typeof previous?.enabled === 'boolean') group.enabled = previous.enabled;
    for (const event of Object.keys(EVENTS)) {
        const hooks = [{ type: 'command', command: `${BRIDGE_COMMAND} ${event}`, timeout: HOOK_TIMEOUT_SECONDS }];
        group[event] = event.endsWith('ToolUse') ? [{ matcher: '.*', hooks }] : hooks;
    }
    return group;
}

async function statOrMissing(file) {
    return fs.lstat(file).catch(error => {
        if (error.code === 'ENOENT') return null;
        throw error;
    });
}

export async function syncAntigravityHooks({ rootDir, check = false }) {
    const dir = path.join(rootDir, '.agents');
    const file = path.join(dir, 'hooks.json');
    const dirStat = await statOrMissing(dir);
    if (dirStat && !dirStat.isDirectory()) throw new Error('Expected a local .agents directory');
    const fileStat = await statOrMissing(file);
    if (fileStat && !fileStat.isFile()) throw new Error('Expected a regular .agents/hooks.json file');
    const original = fileStat ? await fs.readFile(file, 'utf8') : null;
    const config = original === null ? {} : JSON.parse(original);
    if (!record(config)) throw new Error('Expected an object in .agents/hooks.json');

    const prior = config[GROUP];
    const generated = renderGroup(prior);
    if (isDeepStrictEqual(prior, generated)) return 'current';
    if (check) throw new Error('Missing or stale easy-claude group in .agents/hooks.json; run Antigravity hook sync');

    // Refuse a naming collision with a project-owned group. A launcher in a managed event identifies
    // a prior generated group even after a handler, timeout, matcher or enabled value has changed.
    const owned =
        record(prior) &&
        Object.keys(EVENTS).some(event => {
            const handlers = prior[event];
            return (
                Array.isArray(handlers) &&
                handlers.some(item => {
                    const hooks = Array.isArray(item?.hooks) ? item.hooks : [item];
                    return hooks.some(hook => typeof hook?.command === 'string' && hook.command.startsWith(`${BRIDGE_COMMAND} `));
                })
            );
        });
    if (Object.hasOwn(config, GROUP) && !owned) throw new Error('The workspace already has a custom easy-claude hook group; rename it before syncing');

    await fs.mkdir(dir, { recursive: true });
    const staging = `${file}.${randomUUID()}.tmp`;
    try {
        await fs.writeFile(staging, `${JSON.stringify({ ...config, [GROUP]: generated }, null, 2)}\n`, { flag: 'wx', mode: fileStat?.mode ?? 0o644 });
        // Avoid clobbering another hook editor that saved while sync was rendering.
        const latest = await fs.readFile(file, 'utf8').catch(error => {
            if (error.code === 'ENOENT') return null;
            throw error;
        });
        if (latest !== original) throw new Error('.agents/hooks.json changed during sync; rerun sync after the other writer finishes');
        await fs.rename(staging, file);
    } finally {
        await fs.rm(staging, { force: true });
    }
    return 'updated';
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
    try {
        const args = process.argv.slice(2);
        if (args.length > 1 || (args.length && args[0] !== '--check')) throw new Error('Usage: node .claude/scripts/antigravity/sync-hooks.mjs [--check]');
        const rootDir = path.resolve(path.dirname(scriptPath), '../../..');
        const result = await syncAntigravityHooks({ rootDir, check: args.includes('--check') });
        console.log(`[antigravity-hooks] ${result}: .agents/hooks.json`);
    } catch (error) {
        console.error(`[antigravity-hooks] ${error.message}`);
        process.exitCode = 1;
    }
}
