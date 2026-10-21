#!/usr/bin/env node
// Host observer for the Claude Code evaluation adapter: a PostToolUse / PostToolUseFailure hook.
// `node claude-code-observer.mjs <stateDir> <worldDir> --init` records the starting snapshot; as a hook
// it takes both directories from CTX_EVAL_STATE_DIR and CTX_EVAL_WORLD_DIR (no path in the hook's
// command string). Without `--init` it reads the hook payload on stdin, diffs the world against the previous
// snapshot and appends one event (the payload plus the files this tool call changed) to
// `<stateDir>/events.jsonl`. It never writes inside the world and prints nothing, so it adds no
// context to the run under evaluation.
// PORTABILITY CONTRACT: node: built-ins only.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { isInvokedAsScript } = createRequire(import.meta.url)('../lib/project-root.cjs');

const MAX_FILES = 5000;

/** Relative POSIX path → content hash for every regular file under `root` (symlinks not followed). */
export function snapshot(root) {
    const out = {};
    const walk = dir => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (Object.keys(out).length >= MAX_FILES) return;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile()) out[path.relative(root, full).split(path.sep).join('/')] = crypto.createHash('sha1').update(fs.readFileSync(full)).digest('hex');
        }
    };
    walk(root);
    return out;
}

/** Files added, removed or changed between two snapshots, sorted. Pure. */
export function changed(before, after) {
    const names = new Set([...Object.keys(before), ...Object.keys(after)]);
    return [...names].filter(name => before[name] !== after[name]).sort();
}

function main() {
    const [argState, argWorld, flag] = process.argv.slice(2);
    const stateDir = argState || process.env.CTX_EVAL_STATE_DIR;
    const worldDir = argWorld || process.env.CTX_EVAL_WORLD_DIR;
    if (!stateDir || !worldDir) return;
    const snapFile = path.join(stateDir, 'snapshot.json');
    const now = snapshot(worldDir);
    // Replace the snapshot by rename, so a concurrently running observer never reads a torn file.
    const save = () => { const temp = `${snapFile}.${process.pid}`; fs.writeFileSync(temp, JSON.stringify(now)); fs.renameSync(temp, snapFile); };
    if (flag === '--init') { save(); return; }
    let payload = {};
    try { payload = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { payload = {}; }
    const before = fs.existsSync(snapFile) ? JSON.parse(fs.readFileSync(snapFile, 'utf8')) : {};
    const row = {
        hook_event_name: payload.hook_event_name, tool_name: payload.tool_name, tool_input: payload.tool_input,
        tool_response: payload.tool_response ?? payload.error ?? null, changedPaths: changed(before, now)
    };
    fs.appendFileSync(path.join(stateDir, 'events.jsonl'), `${JSON.stringify(row)}\n`);
    save();
}

if (isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url))) {
    // An observer failure must never alter the run; the adapter reports a missing event log instead.
    try { main(); } catch { /* recorded as an absent event */ }
}
