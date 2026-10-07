#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { TextDecoder } = require('node:util');
const { LIMITS, trackingContext } = require('../../../hooks/lib/task-tracking-config.cjs');
const { fail } = require('../../../hooks/lib/task-tracking-files.cjs');
const { readProgress } = require('../../../hooks/lib/task-progress-reader.cjs');
const { executeOperation, operationCatalogue, validateRequest, sanitized } = require('../../../hooks/lib/task-tracking.cjs');
const { resolveActor } = require('../../../hooks/lib/task-tracking-identity.cjs');
const { readConcerns } = require('../../../hooks/lib/task-tracking-concerns.cjs');
const { resolveTrackingProfile } = require('../../../hooks/lib/task-tracking-profile.cjs');
const report = require('../../../hooks/lib/task-tracking-report.cjs');
const { ensurePackages } = require('../lib/package-setup.cjs');
const COMMANDS = Object.freeze(['help', 'identity', 'catalogue', 'concerns', 'inspect', 'check', 'ready', 'apply', 'report', 'serve', 'link', 'unlink', 'checkpoint', 'migrate']);
// Answered from Node built-ins alone; every other command may read records and needs the declared packages.
const BUILT_IN_COMMANDS = Object.freeze(['help', 'identity']);
// Each of these ends a serving workspace through its one graceful shutdown.
const STOP_SIGNALS = Object.freeze(['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']);

function help() {
    return { schemaVersion: 1, defaultPurpose: 'inspect', commands: [...COMMANDS],
        usage: { help: 'help (no root or scan)', catalogue: 'catalogue --root CHECKOUT',
            identity: 'identity --root CHECKOUT [--actor EXACT_CUSTOM_ID]; read-only selected actor discovery',
            concerns: 'concerns --root CHECKOUT [--ref LOCAL_REF]; JSON stdin {schemaVersion:1,itemIds:[exact IDs],paths:[public project-relative paths]}',
            inspect: 'inspect|check|ready --root CHECKOUT [--group EXACT_ID] [--ref LOCAL_REF]',
            apply: 'apply --root CHECKOUT [--actor MEMBER]; JSON stdin retains actor.memberId from identity/catalogue',
            session: 'link|unlink|checkpoint --root CHECKOUT --session ACTUAL_SESSION [--actor MEMBER] --producer ACTUAL_PRODUCER',
            report: 'report --root CHECKOUT [--group EXACT_ID] [--ref LOCAL_REF] [--open]',
            migrate: 'migrate --root CHECKOUT [--dry-run | --abandon]; moves a project that stores the earlier vocabulary to the current one, or completes an unfinished migration, and never abandons one; --dry-run previews and changes nothing; --abandon is the only way to abandon an unfinished migration: after the record root and the project configuration were restored from version control or a backup it checks that the earlier project is back whole and removes only the progress record (status abandoned), and otherwise changes nothing and names what is not back; needs no actor',
            serve: 'serve --root CHECKOUT [--actor MEMBER] [--write] [--open] [--terminal]; --open requests Google Chrome, else the default browser; --terminal runs the workspace in a terminal window of its own, which the person closes to stop it' },
        boundaries: ['Canonical apply.operation=link and session link/unlink are separate',
            'Manual proof requires --manual-proof; ordinary CLI cannot record test/review proof or unobserved activity',
            'Readiness uses --review; acceptance uses --accept with actual current proof and a separate decision',
            'Health uses --attest-health; eligible draft deletion uses --delete-draft and current preview',
            'Canceled or retired work is deleted entirely with --delete-item, an explicit reason and current preview; open, started or accepted work is canceled or retired first, and nothing cascades',
            'A transition with patch.correction=true, a reason and --change-state places work in any other recorded state, such as canceled back to draft; done is still reached only by acceptance, and each state keeps the facts it requires',
            'Reuse original request/operation identity on retry; inspection changes no work',
            'A project that stores the earlier vocabulary is read-only (MIGRATION_REQUIRED) until migrate is run explicitly; migration is never a side effect of a read or a save, and it is one-way: going back means restoring the record root and the project configuration from version control'] };
}

function argumentsFor(argv) {
    const [command, ...args] = argv;
    if (!COMMANDS.includes(command)) fail('INVALID_INPUT', `Use ${COMMANDS.join('|')}`);
    const values = {};
    const flags = new Set(['write', 'open', 'review', 'manual-proof', 'accept', 'attest-health', 'delete-draft', 'delete-item', 'change-state', 'terminal', 'dry-run', 'abandon']);
    const keys = new Set(['root', 'actor', 'group', 'ref', 'session', 'producer']);
    for (let n = 0; n < args.length; n++) {
        const key = args[n].startsWith('--') ? args[n].slice(2) : '';
        if (!key || Object.hasOwn(values, key) || (!flags.has(key) && !keys.has(key))) fail('INVALID_INPUT', 'Unknown, repeated, or positional option');
        if (flags.has(key)) values[key] = true;
        else { const value = args[++n]; if (!value || value.startsWith('--')) fail('INVALID_INPUT', 'Option needs a literal value'); values[key] = value; }
    }
    const readOptions = { help: [], identity: ['root', 'actor'], catalogue: ['root'], concerns: ['root', 'ref'] }[command];
    if (readOptions && Object.keys(values).some(key => !readOptions.includes(key))) fail('INVALID_INPUT', 'This read command does not accept actor, permission, group or session options');
    if (command === 'migrate' ? Object.keys(values).some(key => !['root', 'dry-run', 'abandon'].includes(key)) : values['dry-run'] || values.abandon) fail('INVALID_INPUT', 'Only migrate accepts --dry-run and --abandon, and migrate accepts no actor, permission, group or session options');
    if (values['dry-run'] && values.abandon) fail('INVALID_INPUT', 'Choose one of --dry-run and --abandon: abandoning cannot be previewed, and it changes nothing unless the earlier project is back whole');
    if (command === 'help') return { command, values, root: null };
    if (!values.root) fail('INVALID_INPUT', 'Select one checkout with --root; no ambient root is used');
    return { command, values, root: fs.realpathSync(values.root) };
}

async function input(stream) {
    const chunks = [];
    let size = 0;
    for await (const chunk of stream) {
        size += Buffer.byteLength(chunk);
        if (size > LIMITS.recordBytes) fail('LIMIT_EXCEEDED', 'Operation input exceeds the byte budget');
        chunks.push(Buffer.from(chunk));
    }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
    catch { fail('INVALID_INPUT', 'Provide one JSON operation on stdin'); }
}

/** A missing declared package is installed once here; a failed setup refuses with what to do by hand. */
async function requirePackages(command, setup = ensurePackages) {
    if (BUILT_IN_COMMANDS.includes(command)) return;
    const result = await setup();
    // Diagnostics stay off stdout, which carries exactly one result.
    if (result.status === 'installed') process.stderr.write(`${JSON.stringify({ status: 'setup', installed: result.packages })}\n`);
    if (result.status === 'unavailable') fail('PACKAGE_SETUP_FAILED', `${result.packages.length ? `Missing ${result.packages.join(', ')}` : 'Package setup unavailable'}: ${result.reason}. ${result.remedy}, then retry`);
}

/**
 * The argv a terminal window runs for `serve --terminal`: the same command without that flag, so the window serves
 * the workspace instead of asking for another window. An actor travels as an argument of its own.
 */
function terminalCommand(root, values, node = process.execPath, script = __filename) {
    return [node, script, 'serve', '--root', root, ...(values.actor ? ['--actor', values.actor] : []),
        ...(values.write ? ['--write'] : []), ...(values.open ? ['--open'] : [])];
}

async function run(argv, stdin = process.stdin) {
    const { command, values, root } = argumentsFor(argv);
    if (command === 'help') return help();
    await requirePackages(command);
    const context = trackingContext(root);
    if (command === 'identity') {
        const resolved = resolveActor(context, values.actor, { allowUnregisteredCustom: true });
        return sanitized({ schemaVersion: 1, actor: resolved.member.id, member: resolved.member, source: resolved.selection.source,
            root: context.root, unregistered: resolved.unregistered, grantsAuthority: false });
    }
    if (command === 'catalogue') {
        const profile = resolveTrackingProfile(context);
        return sanitized({ ...operationCatalogue(), profile, applicable: profile.available,
            coverage: profile.available ? 'complete' : 'unavailable' });
    }
    if (command === 'concerns') return readConcerns(root, await input(stdin), { ...(values.ref !== undefined ? { ref: values.ref } : {}) });
    if (['inspect', 'check', 'ready'].includes(command)) {
        const snapshot = readProgress(root, { groupId: values.group, ref: values.ref });
        return command === 'ready' ? { coverage: snapshot.coverage, ready: snapshot.ready, excluded: snapshot.excluded } : snapshot;
    }
    if (command === 'apply') {
        const request = await input(stdin);
        let selected;
        if (values.actor === undefined) { validateRequest(request); selected = resolveActor(context); }
        return executeOperation(request, { root, actor: selected?.member.id || values.actor, identity: selected?.selection, canWrite: true,
            canReview: !!values.review, canRecordManual: !!values['manual-proof'], canAccept: !!values.accept, canAttest: !!values['attest-health'], canDelete: !!values['delete-draft'], canDeleteEnded: !!values['delete-item'], canCorrectState: !!values['change-state'] });
    }
    if (command === 'link' || command === 'unlink') {
        const { linkSession } = require('../../../hooks/lib/task-tracking-upkeep.cjs');
        const value = await input(stdin);
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['itemIds', 'runId', 'occurrenceId'].includes(key))) fail('INVALID_INPUT', 'Link accepts exact itemIds and actual optional workflow context');
        return linkSession({ root, sessionId: values.session, actor: values.actor, producer: values.producer,
            itemIds: value.itemIds, runId: value.runId, occurrenceId: value.occurrenceId, unlink: command === 'unlink' });
    }
    if (command === 'checkpoint') {
        const { checkpoint } = require('../../../hooks/lib/task-tracking-upkeep.cjs');
        const value = await input(stdin);
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['checkpointId', 'primary', 'observation', 'context'].includes(key))) fail('INVALID_INPUT', 'Checkpoint accepts actual primary, bounded observation and actual workflow context');
        return checkpoint({ root, sessionId: values.session, actor: values.actor, producer: values.producer, ...value });
    }
    if (command === 'migrate') return sanitized(await require('../../../hooks/lib/task-tracking-migration.cjs').migrate(root, { dryRun: !!values['dry-run'], abandon: !!values.abandon }));
    if (command === 'report') return values.open ? report.ensureAndOpenReport(root, { ref: values.ref, groupId: values.group }) : report.ensureReport(root, { ref: values.ref, groupId: values.group });
    if (command === 'serve') {
        if (values.terminal) {
            // The same command without this flag runs in a terminal window of its own; this process only asks for that window.
            // An actor is resolved here first, so an unusable identity is reported to the caller instead of to a closing window.
            if (values.write) resolveActor(context, values.actor);
            const { launchTerminal } = require('../lib/terminal-launch.cjs');
            return { status: 'terminal', root, writable: !!values.write, terminal: await launchTerminal(terminalCommand(root, values), root) };
        }
        const { startWorkspace } = require('../lib/workspace-server.cjs');
        if (!values.open) return startWorkspace({ root, actor: values.actor, writable: !!values.write });
        // The browser is handed a single-use launch link, now and whenever a page without a session asks for the workspace
        // to be opened again. The workspace keeps serving whatever the outcome is; its address is printed either way.
        const { launchBrowser } = require('../lib/browser-launch.cjs');
        const workspace = await startWorkspace({ root, actor: values.actor, writable: !!values.write, reopen: link => launchBrowser(link) });
        return { ...workspace, launch: await launchBrowser(workspace.launchLink()) };
    }
    fail('INVALID_INPUT', `Use ${COMMANDS.join('|')}`);
}

async function main() {
    try {
        const result = await run(process.argv.slice(2));
        if (result?.server) {
            let stopping;
            // Every way of ending the workspace takes the one shutdown, once: admitted work settles before the process ends.
            const stop = () => { stopping ||= result.close().then(() => { process.exitCode = 0; }).catch(error => {
                process.stderr.write(`${JSON.stringify(sanitized({ status: 'indeterminate', code: error.code || 'SHUTDOWN_FAILURE',
                    reason: error.code ? error.message : 'Workspace shutdown failed; inspect the original operation before retrying' }))}\n`);
                process.exitCode = 1;
            }); };
            // Closing the terminal window arrives as SIGHUP (on Windows too, for a closed console) and Ctrl+Break as SIGBREAK.
            // Unhandled, either ends the process at once, mid-write, and leaves the writer lock behind.
            // The handlers are in place before the address is announced, so a stop that follows the announcement at once is graceful.
            for (const signal of STOP_SIGNALS) process.once(signal, stop);
            process.stdout.write(`${JSON.stringify({ status: 'listening', url: result.url, root: result.root, writable: result.writable,
                ...(result.launch ? { launch: result.launch } : {}) })}\n`);
        } else {
            process.stdout.write(`${JSON.stringify(result)}\n`);
            if (result?.primary?.status === 'refused' || result?.coverage === 'unavailable') process.exitCode = 1;
            // A migration that did not finish, or did not start, is a failed command: a script must not carry on as if it had.
            // An abandoned migration is the outcome its own request asked for; a refused abandon answers as interrupted.
            if (result?.kind === 'migration' && ['refused', 'interrupted', 'failed'].includes(result.status)) process.exitCode = 1;
        }
    } catch (error) {
        process.stdout.write(`${JSON.stringify({ status: 'refused', code: error.code || 'IO_FAILURE', reason: error.code ? error.message : 'Selected operation unavailable' })}\n`);
        process.exitCode = 1;
    }
}

if (require.main === module) main();
module.exports = { argumentsFor, input, run, requirePackages, terminalCommand, STOP_SIGNALS };
