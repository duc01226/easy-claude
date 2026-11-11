'use strict';

/**
 * Work-claim reminders — the framework side of "claim work when it starts" (`workTracking`, off by default).
 *
 * A project that claims its work in a tracker before changing anything (one tracker-only claim commit and a draft
 * pull request) sets `workTracking.mode: "remind"` and names its commands. Then:
 * - on a prompt, a branch with no claim gets a short rule once per session, and a claimed branch one status line;
 * - after the first edit of a tracked file on an unclaimed branch, one nudge;
 * - after compaction or clear the notice re-arms (hosts without a transcript re-arm through SessionStart).
 * A declined branch, `mode: off`, a detached head and a directory outside Git stay silent. The hooks read local Git
 * state only (no network) and never block a tool. The claim record lives in the branch's Git configuration:
 * `branch.<name>.workClaim`, `.workClaimPr` and `.workClaimDeclined` — the keys a project's claim command writes.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MODES = Object.freeze(['off', 'remind']);
const AUTO_MERGE = Object.freeze(['ask', 'when-green']);
const CLAIM_CONFIG = Object.freeze({ claim: 'workClaim', pr: 'workClaimPr', declined: 'workClaimDeclined' });
const DEFAULTS = Object.freeze({
    mode: 'off',
    claimCommand: '',
    statusCommand: '',
    declineCommand: '',
    // No default: a project names where its tracker files live. Without it nothing counts as tracker text, so no
    // commit is exempt from review and every edit counts for the nudge.
    trackerPaths: Object.freeze([]),
    claimCommitPrefix: 'chore(trackers): start ',
    staleDraftDays: 5,
    autoMerge: 'ask'
});
/** Keys a person may set for themselves (`~/.claude/.ck.json`, `.claude/.ck.local.json`, environment); the rest are team-only. */
const PERSONAL_KEYS = Object.freeze(['mode', 'autoMerge']);
const MARKER = '<!-- CK:WORK-CLAIM -->';
const GROUP = 'work-claim';
const NUDGE_STATE = 'work-claim-nudge';
const GENERATION_STATE = 'work-claim-generation';
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'apply_patch']);

const nonBlank = value => typeof value === 'string' && value.trim() !== '';

/** One layer's `workTracking` object, or undefined when the file or section is absent or unreadable. */
function readLayer(file) {
    if (!file) return undefined;
    try {
        const routing = require('../../scripts/lib/workflow-routing-config.cjs');
        const config = JSON.parse(routing.decodeConfigText(fs.readFileSync(file)));
        const section = config && typeof config === 'object' && !Array.isArray(config) ? config.workTracking : undefined;
        return section && typeof section === 'object' && !Array.isArray(section) ? section : undefined;
    } catch {
        return undefined; // Advisory: an unreadable layer is no layer; the schema check reports it.
    }
}

/** Valid values of one layer: unknown keys and invalid values are dropped, never thrown. */
function cleanLayer(section, keys) {
    const out = {};
    if (!section) return out;
    for (const key of keys) {
        const value = section[key];
        if (value === undefined) continue;
        if (key === 'mode' && MODES.includes(value)) out.mode = value;
        else if (key === 'autoMerge' && AUTO_MERGE.includes(value)) out.autoMerge = value;
        else if (['claimCommand', 'statusCommand', 'declineCommand', 'claimCommitPrefix'].includes(key) && nonBlank(value)) out[key] = value;
        else if (key === 'trackerPaths' && Array.isArray(value) && value.length && value.every(nonBlank)) out.trackerPaths = value.slice();
        else if (key === 'staleDraftDays' && Number.isInteger(value) && value > 0) out.staleDraftDays = value;
    }
    return out;
}

/**
 * Effective `workTracking`: defaults → project config (team) → `~/.claude/.ck.json` → `.claude/.ck.local.json` →
 * `CK_WORK_TRACKING_MODE` / `CK_WORK_TRACKING_AUTO_MERGE`. Personal layers set only `mode` and `autoMerge`.
 * `sources` names the layer each key came from (framework-features shows it); `team` is the project's own mode,
 * which alone decides the commit-gate exemption (a personal layer never relaxes a team's review gate).
 */
function resolveWorkTracking(options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const env = options.env || process.env;
    const routing = require('../../scripts/lib/workflow-routing-config.cjs');
    const settings = { ...DEFAULTS, trackerPaths: DEFAULTS.trackerPaths.slice() };
    const sources = Object.fromEntries(Object.keys(DEFAULTS).map(key => [key, 'default']));
    const apply = (layer, source) => {
        for (const [key, value] of Object.entries(layer)) {
            settings[key] = value;
            sources[key] = source;
        }
    };
    const team = cleanLayer(readLayer(routing.resolveProjectConfigPath(rootDir)), Object.keys(DEFAULTS));
    apply(team, 'project-config');
    apply(cleanLayer(readLayer(routing.resolveUserConfigPath(options.homeDir)), PERSONAL_KEYS), 'user-config');
    apply(cleanLayer(readLayer(routing.resolveLocalOverridePath(rootDir)), PERSONAL_KEYS), 'local-override');
    const fromEnv = { mode: env.CK_WORK_TRACKING_MODE, autoMerge: env.CK_WORK_TRACKING_AUTO_MERGE };
    // Values are de-quoted as the sibling settings are (cmd.exe `set NAME="off"` keeps the quotes).
    const clean = value => value.trim().replace(/^(["'])(.*)\1$/, '$2').trim().toLowerCase().replace(/^when_green$/, 'when-green');
    apply(cleanLayer(Object.fromEntries(Object.entries(fromEnv).filter(([, v]) => nonBlank(v)).map(([k, v]) => [k, clean(v)])), PERSONAL_KEYS), 'environment');
    return { settings, sources, team: { mode: team.mode || DEFAULTS.mode } };
}

/** A `trackerPaths` glob list as a matcher for repository-relative POSIX paths: `**` any depth, `*` one segment. */
function pathMatcher(globs) {
    const patterns = globs.map(glob => {
        let source = '';
        for (let i = 0; i < glob.length; i += 1) {
            const char = glob[i];
            if (char === '*' && glob[i + 1] === '*') {
                const slash = glob[i + 2] === '/';
                source += slash ? '(?:.*/)?' : '.*';
                i += slash ? 2 : 1;
            } else if (char === '*') source += '[^/]*';
            else if (char === '?') source += '[^/]';
            else source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        }
        return new RegExp(`^${source}$`);
    });
    return file => patterns.some(pattern => pattern.test(String(file).replace(/\\/g, '/').replace(/^\.\//, '')));
}

/** One local Git call, bounded so a hook with a 3 s budget never loses its other output to a slow Git. */
const runGit = (root, args, input) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 800, ...(input === undefined ? {} : { input }) });
    return result.status === 0 ? result.stdout : null;
};

/**
 * The checked-out branch and its claim record, from two local Git calls; null on a detached head or outside Git.
 * Git stores configuration variable names in lower case, so the keys are read case-insensitively.
 */
function branchState(root, git = runGit) {
    const branch = (git(root, ['symbolic-ref', '--quiet', '--short', 'HEAD']) || '').trim();
    if (!branch) return null;
    const escaped = branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const lines = (git(root, ['config', '--get-regexp', `^branch\\.${escaped}\\.workclaim`]) || '').split('\n');
    const value = key => {
        const prefix = `branch.${branch}.${key}`.toLowerCase();
        const line = lines.find(l => l.toLowerCase().startsWith(`${prefix} `));
        return line ? line.slice(prefix.length + 1).trim() || null : null;
    };
    const pr = Number(value(CLAIM_CONFIG.pr));
    return { branch, claim: value(CLAIM_CONFIG.claim), pr: Number.isInteger(pr) && pr > 0 ? pr : null, declined: value(CLAIM_CONFIG.declined) };
}

const command = (settings, key, fallback) => (nonBlank(settings[key]) ? `\`${settings[key]}\`` : fallback);

/** The prompt notice for a branch state, or null (silent). */
function promptNotice(settings, state) {
    if (settings.mode !== 'remind' || !state || state.declined || state.branch === 'main' || state.branch === 'master') return null;
    if (state.claim && state.pr) {
        return `${MARKER}\nWork claim: \`${state.branch}\` tracks ${state.claim} in pull request #${state.pr}. Keep this request's changes on that pull request; before Ready, finish the task as the project's claim rule says. A clearly unrelated new task gets its own claim.${nonBlank(settings.statusCommand) ? ` Check the claim with \`${settings.statusCommand}\`.` : ''}`;
    }
    if (state.claim) {
        return `${MARKER}\nWork claim: \`${state.branch}\` claims ${state.claim}, but its push or pull request is pending. Run ${command(settings, 'claimCommand', "the project's claim command")} again to finish it.`;
    }
    return `${MARKER}\nWork claim: \`${state.branch}\` has no claimed work. When this request will change tracked files (implement, fix, refactor, enhance, write a spec or plan into the repository), claim it before the first edit with ${command(settings, 'claimCommand', "the project's claim command")}. When it is unclear whether new change work is starting, ask the user once; if they say not to track it, record that with ${command(settings, 'declineCommand', "the project's decline command")}. Never claim or ask for questions, explanations, read-only reviews, investigations, brainstorms, reports, running commands, or follow-ups inside work already claimed.`;
}

/** The first-edit nudge for edited paths, or null: only an unclaimed, undeclined branch editing a non-tracker file. */
function editNudge(settings, state, paths) {
    if (settings.mode !== 'remind' || !state || state.claim || state.declined || state.branch === 'main' || state.branch === 'master') return null;
    const isTracker = pathMatcher(settings.trackerPaths);
    const edited = paths.filter(file => !isTracker(file));
    if (!edited.length) return null;
    return `${MARKER}\nWork claim: \`${edited[0]}\` changed on \`${state.branch}\`, which has no claimed work. Claim it now with ${command(settings, 'claimCommand', "the project's claim command")}, or, if the user does not want this tracked, record why with ${command(settings, 'declineCommand', "the project's decline command")}.`;
}

function store(root) {
    return path.join(root, ...require('./protocol-delivery.cjs').STORE_SEGMENTS);
}

const usableSession = input => input && typeof input.session_id === 'string' && input.session_id.trim() !== '';

/** UserPromptSubmit: deliver the notice once per state and session; SessionStart compact|clear: re-arm it. */
async function deliverPromptNotice(input, deps = {}) {
    try {
        if (!usableSession(input)) return '';
        const root = deps.root || require('./protocol-delivery.cjs').resolveRoot(input, deps);
        if (!root) return '';
        const ledger = require('./convention-ledger.cjs');
        const records = store(root);
        if (input.hook_event_name === 'SessionStart') {
            if (['compact', 'clear'].includes(input.source) && fs.existsSync(ledger.sessionDir(records, input.session_id))) {
                ledger.writeSessionState(records, input.session_id, GENERATION_STATE, { generation: crypto.randomBytes(8).toString('hex') });
            }
            return '';
        }
        if (input.hook_event_name !== 'UserPromptSubmit') return '';
        const { settings } = resolveWorkTracking({ rootDir: root, env: deps.env, homeDir: deps.homeDir });
        if (settings.mode === 'off') return '';
        const text = promptNotice(settings, branchState(root, deps.git || runGit));
        if (!text) return '';
        const generation = ledger.readSessionState(records, input.session_id, GENERATION_STATE)?.generation || '';
        const { BYTES_PER_TOKEN } = require('./file-conventions.cjs');
        return await ledger.deliverOnce({
            root: records,
            input,
            group: GROUP,
            hash: crypto.createHash('sha256').update(JSON.stringify([text, generation])).digest('hex'),
            payload: `${text}\n`,
            settings: { reinjectAfterBytes: 150000 * BYTES_PER_TOKEN, reinjectAfterMinutes: null, blindReinjectAfterMinutes: null, compactionMarkers: [ledger.CODEX_COMPACTION_MARKER] },
            now: deps.now ?? Date.now(),
            failOpen: true,
            write: deps.write || ((payload, done) => {
                try { process.stdout.write(payload, error => done(!error)); } catch { done(false); }
            })
        });
    } catch {
        return ''; // Advisory: never blocks a prompt or reports an error.
    }
}

/** PostToolUse on an edit: the nudge text once per session and branch, or null. */
function observeEdit(event, root, paths, deps = {}) {
    try {
        if (!usableSession(event) || !EDIT_TOOLS.has(event.tool_name) || !paths.length) return null;
        const ledger = require('./convention-ledger.cjs');
        // A helper agent cannot ask the user, so it is never told to claim; the main conversation is.
        if (ledger.scopeFor(event) !== ledger.MAIN_SCOPE) return null;
        const { settings } = resolveWorkTracking({ rootDir: root, env: deps.env, homeDir: deps.homeDir });
        if (settings.mode === 'off') return null;
        const git = deps.git || runGit;
        const state = branchState(root, git);
        // A file Git ignores (personal settings, plans, scratch output) changes nothing the team tracks.
        const ignored = new Set((git(root, ['check-ignore', '-z', '--stdin'], paths.join('\0')) || '').split('\0').filter(Boolean));
        const text = editNudge(settings, state, paths.filter(file => !ignored.has(file)));
        if (!text) return null;
        const records = store(root);
        const seen = ledger.readSessionState(records, event.session_id, NUDGE_STATE)?.branches || [];
        if (seen.includes(state.branch)) return null;
        ledger.writeSessionState(records, event.session_id, NUDGE_STATE, { branches: [...seen, state.branch].slice(-32) });
        return text;
    } catch {
        return null;
    }
}

module.exports = {
    MODES, AUTO_MERGE, CLAIM_CONFIG, DEFAULTS, PERSONAL_KEYS, MARKER,
    resolveWorkTracking, pathMatcher, branchState, promptNotice, editNudge, deliverPromptNotice, observeEdit
};
