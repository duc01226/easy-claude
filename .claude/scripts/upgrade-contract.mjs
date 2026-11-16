#!/usr/bin/env node
/**
 * upgrade-contract.mjs — upstream-only check that every consumer-facing change ships guidance.
 *
 * Problem this solves: a framework change that a consumer must act on (a new config section, a changed
 * workflow step, a new hook, scan target or skill) lands in consumer projects through `/framework-update`
 * as new files only. Unless an upgrade action or notice (`.claude/upgrades/actions/<id>.md`) tells the
 * consumer's agent what to do, nobody does it. This check makes that guidance impossible to forget: it
 * hashes each consumer-facing surface and fails when a surface's hash changed and no action, notice or
 * waiver names `surface@newHash` in its `covers`.
 *
 * Surfaces (one hash each, 12 hex characters of a SHA-256 over a key-sorted JSON form):
 *   config:<section>  each top-level section of the project-config schema, prose fields left out, so a
 *                     new key, a type, a default or an enum value changes it and a reworded text does not
 *   workflow:<id>     each workflow in `.claude/workflows.json`: steps, roles, gates, phases (prose left out)
 *   hooks:<event>     each hook event's registrations in `.claude/settings.json`
 *   scan-targets      the scan target registry: target keys and the docs they write
 *   skills            the names of the framework's skills
 *
 * The snapshot `.claude/upgrades/contract-snapshot.json` records the accepted hash of each surface and
 * what accepted it: the baseline taken when the check was introduced, the id of a covering entry, or a
 * waiver (kept in the snapshot only, with its reason, for a change no consumer needs to act on). A hash in
 * the snapshot that nothing accepts fails too, so pasting a new hash in by hand does not pass.
 *
 * Usage (from the framework repository; Windows, macOS and Linux — Node only):
 *   node .claude/scripts/upgrade-contract.mjs            check; exit 1 lists each problem and its fix
 *   node .claude/scripts/upgrade-contract.mjs --refresh  record covered changes; refused while any is uncovered
 *   node .claude/scripts/upgrade-contract.mjs --init     write the first snapshot (only when none exists)
 *   options: --json, --root=<dir>
 *
 * It runs only in the upstream repository itself (`isUpstreamRepo`: its package.json is named
 * easy-claude-tooling): consumer projects carry this file but have their own skills and hooks, and must
 * never fail on them.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
import { upgradeEntries, orderUpgrades, UPGRADES_DIR, UPGRADE_COVER_RE } from './framework-update.mjs';
import { DEFAULT_FRAMEWORK_PACKAGE_NAME } from './codex/tests/framework-repo.helper.mjs';

export const SNAPSHOT_PATH = '.claude/upgrades/contract-snapshot.json';
const COMMAND = 'node .claude/scripts/upgrade-contract.mjs';
// Prose in the workflow manifest: rewording it changes nothing a consumer must do.
const WORKFLOW_PROSE = new Set(['description', 'intent', 'name', 'whenToUse', 'injectContext', 'when', 'skipReason']);
const SNAPSHOT_ABOUT =
    'Accepted hash of each consumer-facing surface, written only by upgrade-contract.mjs (--init, --refresh). A hash changes only together with an upgrade entry or a waiver that covers it; see .claude/upgrades/README.md.';

const require = createRequire(import.meta.url);

/** JSON with object keys sorted, so a hash depends on content and never on key order. */
function stable(value) {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value instanceof RegExp) return JSON.stringify(String(value));
    if (value && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .filter(key => value[key] !== undefined && typeof value[key] !== 'function')
            .map(key => `${JSON.stringify(key)}:${stable(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value ?? null);
}

export const surfaceHash = value => crypto.createHash('sha256').update(stable(value)).digest('hex').slice(0, 12);

/** A config-schema node without its prose: `describe`, `description` and `_`-prefixed notes. */
function schemaShape(node) {
    if (Array.isArray(node)) return node.map(schemaShape);
    if (!node || typeof node !== 'object' || node instanceof RegExp) return node;
    const shape = {};
    for (const [key, value] of Object.entries(node)) {
        if (key === 'describe' || key === 'description' || key.startsWith('_')) continue;
        shape[key] =
            key === 'properties' && value && typeof value === 'object' && !Array.isArray(value)
                ? Object.fromEntries(
                      Object.entries(value)
                          .filter(([name]) => !name.startsWith('_'))
                          .map(([name, child]) => [name, schemaShape(child)])
                  )
                : schemaShape(value);
    }
    return shape;
}

function withoutProse(value) {
    if (Array.isArray(value)) return value.map(withoutProse);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
        Object.entries(value)
            .filter(([key]) => !WORKFLOW_PROSE.has(key))
            .map(([key, child]) => [key, withoutProse(child)])
    );
}

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

/**
 * True only in the upstream framework repository. Unlike the shared `isFrameworkRepo` guard, the package
 * name is fixed: a project that vendors the framework may set `portability.toolingPackageName` to its own
 * package for the framework's self-checks, but its own skills and hooks are not upstream surfaces, and this
 * check against upstream's snapshot would fail there on every update.
 */
export function isUpstreamRepo(root) {
    try {
        return readJson(path.join(root, 'package.json'))?.name === DEFAULT_FRAMEWORK_PACKAGE_NAME;
    } catch {
        return false;
    }
}

/** Every consumer-facing surface of the framework at `root` and its hash. A missing source has no surfaces. */
export function surfaceHashes(root) {
    const surfaces = {};
    const at = rel => path.join(root, rel);
    const schemaFile = at('.claude/hooks/lib/project-config-schema.cjs');
    if (fs.existsSync(schemaFile)) {
        // Read the file as it is now, not as an earlier call in this process loaded it.
        delete require.cache[require.resolve(schemaFile)];
        const schemaModule = require(schemaFile);
        for (const [section, node] of Object.entries(schemaModule.SCHEMA || {}))
            if (!section.startsWith('_')) surfaces[`config:${section}`] = surfaceHash(schemaShape(node));
        // Allowed values the module exports beside the schema (activation tiers, route modes, presets).
        for (const [name, value] of Object.entries(schemaModule)) {
            if (name === 'SCHEMA' || typeof value === 'function') continue;
            surfaces[`config:${name}`] = surfaceHash(value instanceof Set ? [...value].sort() : value);
        }
    }
    if (fs.existsSync(at('.claude/workflows.json'))) {
        for (const [id, workflow] of Object.entries(readJson(at('.claude/workflows.json')).workflows || {}))
            surfaces[`workflow:${id}`] = surfaceHash(withoutProse(workflow));
    }
    if (fs.existsSync(at('.claude/settings.json'))) {
        for (const [event, registrations] of Object.entries(readJson(at('.claude/settings.json')).hooks || {}))
            surfaces[`hooks:${event}`] = surfaceHash(registrations);
    }
    const targets = at('.claude/skills/scan/references/targets.md');
    if (fs.existsSync(targets)) {
        const rows = [...fs.readFileSync(targets, 'utf8').matchAll(/^\| `([a-z0-9-]+)` \| (.+?) \| .+\|\s*$/gm)].map(match => [match[1], match[2].trim()]);
        surfaces['scan-targets'] = surfaceHash(rows.sort((a, b) => a[0].localeCompare(b[0])));
    }
    const skills = at('.claude/skills');
    if (fs.existsSync(skills)) {
        surfaces.skills = surfaceHash(
            fs
                .readdirSync(skills)
                .filter(name => fs.existsSync(path.join(skills, name, 'SKILL.md')))
                .sort()
        );
    }
    return surfaces;
}

/** The upgrade entries in `root`'s `.claude/upgrades/actions/`. */
export function readEntries(root) {
    const dir = path.join(root, UPGRADES_DIR);
    const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter(name => name.endsWith('.md')) : [];
    return upgradeEntries(new Map(names.map(name => [`${UPGRADES_DIR}/${name}`, fs.readFileSync(path.join(dir, name))])));
}

export function readSnapshot(root) {
    const file = path.join(root, SNAPSHOT_PATH);
    return fs.existsSync(file) ? readJson(file) : null;
}

/** A first snapshot: every current hash accepted as the baseline. */
export function initialSnapshot(current) {
    return {
        schemaVersion: 1,
        about: SNAPSHOT_ABOUT,
        baseline: { ...current },
        surfaces: Object.fromEntries(Object.entries(current).map(([surface, hash]) => [surface, { hash, by: 'baseline' }])),
        waivers: []
    };
}

const short = hash => (hash === 'absent' ? 'absent' : `${hash}`);

/**
 * Compare the current surfaces with the snapshot. Returns every problem (with the fix it needs) and the
 * snapshot `--refresh` would write. Problems of kind `unrecorded` are the only ones a refresh settles.
 */
export function evaluateContract({ current, snapshot, entries }) {
    const problems = [];
    const add = (kind, subject, message) => problems.push({ kind, subject, message });
    const valid = entries.filter(entry => entry.kind === 'action' || entry.kind === 'notice');
    for (const entry of entries) {
        if (entry.error) {
            add(
                'entry-invalid',
                entry.path,
                `${entry.error}. A consumer's update lists a broken entry as "cannot be read" and its agent has to guess what to do; fix the file.`
            );
        }
    }
    const ids = new Set(entries.map(entry => entry.id));
    for (const entry of valid) {
        for (const dep of entry.after) {
            if (!ids.has(dep))
                add('entry-after', entry.path, `${entry.id} runs after ${dep}, which no entry in ${UPGRADES_DIR}/ has; fix the id or remove it from "after".`);
        }
    }
    for (const entry of orderUpgrades(valid).filter(item => item.cycle)) {
        add('entry-cycle', entry.path, `${entry.id} is part of an "after" cycle, so no order can run it; remove one of the links.`);
    }
    const waivers = Array.isArray(snapshot?.waivers) ? snapshot.waivers : [];
    for (const [index, waiver] of waivers.entries()) {
        const covers = Array.isArray(waiver?.covers) ? waiver.covers : [];
        if (
            !covers.length ||
            covers.some(cover => typeof cover !== 'string' || !UPGRADE_COVER_RE.test(cover)) ||
            typeof waiver?.reason !== 'string' ||
            !waiver.reason.trim()
        ) {
            add(
                'waiver-invalid',
                `${SNAPSHOT_PATH} waivers[${index}]`,
                'a waiver needs "covers" (surface@hash values) and a "reason" saying why no consumer has to act; fix it.'
            );
        }
    }
    const coverOf = cover =>
        valid.find(entry => entry.covers.includes(cover))?.id || (waivers.some(waiver => waiver?.covers?.includes?.(cover)) ? 'waiver' : null);
    const accepted = snapshot?.surfaces || {};
    const next = {
        schemaVersion: 1,
        about: snapshot?.about || SNAPSHOT_ABOUT,
        baseline: snapshot?.baseline || {},
        surfaces: {},
        waivers
    };
    const names = [...new Set([...Object.keys(current), ...Object.keys(accepted)])].sort();
    for (const surface of names) {
        const now = current[surface] ?? 'absent';
        const record = accepted[surface];
        const was = record?.hash ?? 'absent';
        if (now === was) {
            if (now === 'absent') continue;
            const proven =
                record.by === 'baseline'
                    ? next.baseline[surface] === now
                    : record.by === 'waiver'
                      ? waivers.some(waiver => waiver?.covers?.includes?.(`${surface}@${now}`))
                      : valid.some(entry => entry.id === record.by && entry.covers.includes(`${surface}@${now}`));
            const cover = !proven && coverOf(`${surface}@${now}`);
            if (cover) {
                add(
                    'unrecorded',
                    surface,
                    `${surface}@${now} is now covered by ${cover === 'waiver' ? 'a waiver' : cover}, not "${record.by}"; run ${COMMAND} --refresh.`
                );
                next.surfaces[surface] = { hash: now, by: cover };
                continue;
            }
            if (!proven) {
                add(
                    'unproven',
                    surface,
                    `${SNAPSHOT_PATH} records ${surface}@${now} as accepted by "${record.by}", but nothing by that name accepts that hash. Only ${COMMAND} writes the snapshot (the baseline once, at --init); a hash typed in by hand does not pass. Restore the snapshot from version control, add covers: [${surface}@${now}] to the upgrade entry for this change (or a waiver with its reason), and run ${COMMAND} --refresh. A notice retired after 180 days is replaced by a waiver whose reason names it.`
                );
            }
            next.surfaces[surface] = record;
            continue;
        }
        const cover = `${surface}@${now}`;
        const by = coverOf(cover);
        if (!by) {
            add(
                'uncovered',
                surface,
                `${surface} ${now === 'absent' ? 'was removed' : was === 'absent' ? 'is new' : 'changed'} (snapshot ${short(was)}, now ${short(now)}) and no upgrade action, notice or waiver covers ${cover}. Consumer projects would receive this change through /framework-update with no instruction for their agent. Fix: add an action (steps the consumer runs) or a notice (what to tell the user) under ${UPGRADES_DIR}/ with covers: [${cover}], or, when no consumer needs to do or know anything, a waiver in ${SNAPSHOT_PATH} with that cover and the reason; then run ${COMMAND} --refresh.`
            );
            if (record) next.surfaces[surface] = record;
            continue;
        }
        add('unrecorded', surface, `${cover} is covered by ${by === 'waiver' ? 'a waiver' : by} but not recorded yet; run ${COMMAND} --refresh.`);
        if (now !== 'absent') next.surfaces[surface] = { hash: now, by };
    }
    return { problems, next };
}

function parseArgs(argv) {
    const options = { mode: 'check', json: false };
    for (const arg of argv) {
        if (arg === '--refresh' || arg === '--init') {
            if (options.mode !== 'check') throw new Error('Pass one of --refresh or --init.');
            options.mode = arg.slice(2);
        } else if (arg === '--json') options.json = true;
        else if (arg.startsWith('--root=') && arg.length > 7) options.root = arg.slice(7);
        else throw new Error(`Unknown option ${arg}. Usage: ${COMMAND} [--refresh|--init] [--json] [--root=<dir>]`);
    }
    return options;
}

const writeSnapshot = (root, snapshot) => {
    fs.mkdirSync(path.dirname(path.join(root, SNAPSHOT_PATH)), { recursive: true });
    fs.writeFileSync(path.join(root, SNAPSHOT_PATH), `${JSON.stringify(snapshot, null, 2)}\n`);
};

export function main(argv = process.argv.slice(2), defaultRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..')) {
    const options = parseArgs(argv);
    const root = path.resolve(options.root || defaultRoot);
    const out = (result, text) => process.stdout.write(options.json ? `${JSON.stringify(result, null, 2)}\n` : text);
    if (!isUpstreamRepo(root)) {
        out(
            { skipped: true },
            `upgrade-contract: skipped; this is not the upstream framework repository (its package.json is not named ${DEFAULT_FRAMEWORK_PACKAGE_NAME}). The check guards upstream changes only.\n`
        );
        return 0;
    }
    const current = surfaceHashes(root);
    const snapshot = readSnapshot(root);
    if (options.mode === 'init') {
        if (snapshot) throw new Error(`${SNAPSHOT_PATH} exists; --init writes only the first snapshot. Use --refresh to record covered changes.`);
        writeSnapshot(root, initialSnapshot(current));
        out(
            { initialized: Object.keys(current).length },
            `upgrade-contract: recorded ${Object.keys(current).length} surfaces as the baseline in ${SNAPSHOT_PATH}.\n`
        );
        return 0;
    }
    if (!snapshot) throw new Error(`No ${SNAPSHOT_PATH}: run ${COMMAND} --init once to record the baseline.`);
    const { problems, next } = evaluateContract({ current, snapshot, entries: readEntries(root) });
    const blocking = problems.filter(problem => problem.kind !== 'unrecorded');
    const list = items => items.map(problem => `  ${problem.subject}: ${problem.message}\n`).join('');
    if (options.mode === 'refresh') {
        if (blocking.length) {
            out(
                { refreshed: false, problems: blocking },
                `upgrade-contract: refresh refused; ${blocking.length} problem(s) must be fixed first (a refresh records only covered changes):\n${list(blocking)}`
            );
            return 1;
        }
        const recorded = problems.length;
        if (recorded) writeSnapshot(root, next);
        out(
            { refreshed: true, recorded },
            `upgrade-contract: ${recorded ? `recorded ${recorded} covered change(s) in ${SNAPSHOT_PATH}` : 'nothing to record'}.\n`
        );
        return 0;
    }
    if (problems.length) {
        out({ ok: false, problems }, `upgrade-contract: ${problems.length} problem(s):\n${list(problems)}`);
        return 1;
    }
    out(
        { ok: true, surfaces: Object.keys(current).length },
        `upgrade-contract: ${Object.keys(current).length} consumer-facing surfaces match ${SNAPSHOT_PATH}.\n`
    );
    return 0;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(url.fileURLToPath(import.meta.url))) {
    try {
        process.exitCode = main();
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    }
}
