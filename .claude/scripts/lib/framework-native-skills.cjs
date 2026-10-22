'use strict';

// Native skill discovery happens before hooks. Keep personal overrides outside
// tracked projections, with a small recovery ledger containing only skill policy.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { resolveFrameworkMode, resolveQuietNative } = require('../../hooks/lib/framework-runtime.cjs');
const { resolveCommitReviewMode } = require('./commit-review-policy.cjs');
const { decodeConfigText } = require('./workflow-routing-config.cjs');
const { spliceTopLevelMember } = require('../sync-skill-profile.cjs');

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function runtimeConfig(file) {
    try { return json(read(file), file); } catch { return null; }
}
function read(file) {
    try { return decodeConfigText(fs.readFileSync(file)); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function json(text, file) {
    const value = JSON.parse(text ?? '{}');
    if (!plain(value)) throw new Error(`Expected a JSON object: ${file}`);
    return value;
}
function assertSettingsPath(file) {
    if (fs.lstatSync(file, { throwIfNoEntry: false })?.isSymbolicLink()) {
        throw new Error(`Refusing settings symlink: ${file}`);
    }
}
function atomic(file, text) {
    assertSettingsPath(file);
    if (text === null) { fs.rmSync(file, { force: true }); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${randomUUID()}.tmp`;
    try {
        fs.writeFileSync(temp, text, { flag: 'wx', mode: fs.existsSync(file) ? fs.statSync(file).mode & 0o777 : 0o600 });
        fs.renameSync(temp, file);
    } finally { fs.rmSync(temp, { force: true }); }
}
function registryPath(homeDir = os.homedir()) {
    return path.join(homeDir, '.claude', 'framework-runtime-projects.json');
}
function loadRegistry(file) {
    const value = json(read(file), file);
    if (!Object.keys(value).length) return { version: 1, projects: {} };
    if (value.version !== 1 || !plain(value.projects)) throw new Error(`Invalid native skill recovery registry: ${file}`);
    for (const [root, entry] of Object.entries(value.projects)) {
        if (!path.isAbsolute(root) || !plain(entry) || (entry.disabled !== undefined && !plain(entry.disabled))) {
            throw new Error(`Invalid registered checkout: ${root}`);
        }
    }
    return value;
}
function frontmatterName(text) {
    const header = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text || '')?.[1] || '';
    return /^name:\s*['"]?([^'"\s]+)['"]?\s*$/m.exec(header)?.[1];
}
function catalog(root) {
    const dir = path.join(root, '.claude', 'skills');
    if (!fs.existsSync(dir)) return [];
    const skills = [];
    const visit = current => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
            const target = path.join(current, entry.name);
            if (entry.isDirectory() && !['node_modules', '.git', '.venv', '__pycache__'].includes(entry.name)) visit(target);
            else if (entry.isFile() && entry.name === 'SKILL.md') {
                const name = frontmatterName(read(target));
                if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) throw new Error(`Cannot resolve native skill name: ${target}`);
                skills.push({ name, relative: path.relative(dir, target) });
            }
        }
    };
    visit(dir);
    return skills;
}

// Do not reinterpret arbitrary user TOML. The owned block is ordinary native
// array-of-table syntax. A pre-existing skills.config needs explicit reconciliation;
// refusing before writes is safer than duplicating or shadowing the user's policy.
function assertCodexAppendable(text) {
    const outside = text.replace(/\n?# CK:FRAMEWORK-SKILLS:[a-f0-9]+:START\n[\s\S]*?# CK:FRAMEWORK-SKILLS:[a-f0-9]+:END\n/g, '');
    let inSkills = false;
    for (const line of outside.split(/\r?\n/)) {
        const clean = line.replace(/['"]/g, '').trim();
        if (clean.startsWith('#')) continue;
        if (/^\[/.test(clean)) {
            inSkills = /^\[\s*skills\s*\]/.test(clean);
            if (/^\[\[?\s*skills\s*\.\s*config(?:\s*[.\]]|\s*$)/.test(clean)) {
                throw new Error('Codex already has user-owned skills.config entries; reconcile them before applying the framework mode. No native settings were changed.');
            }
        }
        if (/^skills\s*(?:\.\s*config\b|=)/.test(clean) || (inSkills && /^config\s*=/.test(clean))) {
            throw new Error('Codex has an inline skills configuration; reconcile it before applying the framework mode. No native settings were changed.');
        }
    }
}

// The native policy of a mode. `off` disables every framework skill. `quiet` changes
// nothing natively unless `frameworkRuntime.quietNative` is `restrict`: then it hides
// every framework skill from automatic use, keeping the configured quietSkills and the
// reviews the commit gate still demands, and denies the framework's own agents. Only
// the value this ledger wrote is framework-owned; any other value found on a recorded
// skill is the user's and stops the reconcile.
const OFF_VALUE = 'off';
const QUIET_VALUE = 'user-invocable-only';
// A ledger written before it recorded its value owned either one.
const LEGACY_VALUES = Object.freeze([OFF_VALUE, QUIET_VALUE]);
// An interim ledger written during a switch between off and a quiet restriction also names the
// previous value, because an interrupted write may have left either one in the settings.
const ownedValues = state => (state?.value ? [state.value, state.valuePrevious].filter(Boolean) : LEGACY_VALUES);
// The mode that holds a ledger's skills, for messages: `off`, `quiet`, or either for a legacy ledger.
const heldBy = state => ({ [OFF_VALUE]: 'off', [QUIET_VALUE]: 'quiet' })[state?.value] || 'the framework mode';
const REVIEW_AGENTS = Object.freeze(['code-reviewer', 'security-auditor']);

// Agent definitions run to 100 KB; the name sits in the first few lines.
const AGENT_HEAD_BYTES = 4096;
function readHead(file) {
    const fd = fs.openSync(file, 'r');
    try {
        const buffer = Buffer.alloc(AGENT_HEAD_BYTES);
        return buffer.toString('utf8', 0, fs.readSync(fd, buffer, 0, AGENT_HEAD_BYTES, 0));
    } finally { fs.closeSync(fd); }
}
function agentCatalog(root) {
    const dir = path.join(root, '.claude', 'agents');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(file => file.endsWith('.md')).sort()
        .map(file => frontmatterName(readHead(path.join(dir, file))) || file.slice(0, -3));
}

function nativePolicy(root, effective, homeDir, env, readConfig) {
    if (effective.mode === 'off') return { value: OFF_VALUE, skills: catalog(root), agents: [] };
    if (effective.mode !== 'quiet' || resolveQuietNative({ rootDir: root, homeDir, env, readConfig }).value !== 'restrict') {
        return { value: null, skills: [], agents: [] };
    }
    // An unreadable review preference keeps every review the gate may ask for.
    let review;
    try { review = resolveCommitReviewMode({ rootDir: root, homeDir, env }).mode; } catch { review = undefined; }
    const reviews = { lightweight: ['commit-review'], 'risk-based': ['why-review', 'changes-review'] }[review] || ['commit-review', 'why-review', 'changes-review'];
    const keep = new Set([...effective.quietSkills, 'commit', ...reviews]);
    // why-review and changes-review dispatch these agents; commit-review dispatches none.
    const keptAgents = review === 'lightweight' ? [] : REVIEW_AGENTS;
    return { value: QUIET_VALUE, skills: catalog(root).filter(entry => !keep.has(entry.name)),
        agents: agentCatalog(root).filter(name => !keptAgents.includes(name.toLowerCase())) };
}

function release(overrides, name, previous, state, owned = ownedValues(state)) {
    if (owned.includes(overrides[name])) {
        if (previous === null) delete overrides[name]; else overrides[name] = previous;
    } else if (!(overrides[name] === previous || (previous === null && overrides[name] === undefined))) {
        throw new Error(`Claude skill ${name} changed while ${heldBy(state)}; preserved it. Reconcile before restoring.`);
    }
}

// Remove the owned Codex block. An interim ledger also names the previous
// block, because an interrupted write may have left either one in the file.
function stripCodexBlock(text, state) {
    const block = [state.codexBlock, state.codexBlockPrevious].find(candidate => candidate && text.includes(candidate));
    if (block) return text.replace(block, '');
    if ((state.codexBlock || state.codexBlockPrevious) && text.includes(`CK:FRAMEWORK-SKILLS:${state.id}:`)) return null;
    return text;
}

function withDeny(permissions, deny, memberExisted) {
    const { deny: _previous, ...rest } = permissions;
    const value = deny.length ? { ...rest, deny } : rest;
    return Object.keys(value).length || memberExisted ? value : undefined;
}

function planNativeSkills({ rootDir, scope = 'checkout', homeDir = os.homedir(), env = process.env, preference } = {}) {
    const root = fs.realpathSync(rootDir);
    const file = registryPath(homeDir);
    assertSettingsPath(file);
    const initial = loadRegistry(file);
    const registry = structuredClone(initial);
    registry.projects[root] ||= {};
    const roots = scope === 'user' ? Object.keys(registry.projects).sort() : [root];
    const changes = new Map();
    const get = target => changes.has(target) ? changes.get(target).after : read(target);
    const set = (target, after) => {
        if (!changes.has(target)) changes.set(target, { file: target, before: read(target), after });
        else changes.get(target).after = after;
    };
    const results = [];
    // Interim owns both old and newly restricted keys before any native writes.
    const interim = structuredClone(registry);
    for (const checkout of roots) {
        if (!fs.existsSync(checkout)) { results.push({ root: checkout, status: 'missing-checkout', restartRequired: false }); continue; }
        if (fs.realpathSync(checkout) !== checkout) throw new Error(`Registered checkout identity changed: ${checkout}`);
        const readConfig = target => target === preference?.file ? preference.value : runtimeConfig(target);
        const effective = resolveFrameworkMode({ rootDir: checkout, homeDir, env, readConfig });
        const entry = registry.projects[checkout];
        const saved = entry.disabled;
        const { value, skills: entries, agents } = nativePolicy(checkout, effective, homeDir, env, readConfig);
        const names = [...new Set(entries.map(entry => entry.name))];
        const claudePath = path.join(checkout, '.claude', 'settings.local.json');
        const currentText = get(claudePath);
        const current = json(currentText, claudePath);
        if (current.skillOverrides !== undefined && !plain(current.skillOverrides)) throw new Error(`skillOverrides must be an object: ${claudePath}`);
        if (current.permissions !== undefined && !plain(current.permissions)) throw new Error(`permissions must be an object: ${claudePath}`);
        const permissions = current.permissions || {};
        if (permissions.deny !== undefined && !Array.isArray(permissions.deny)) throw new Error(`permissions.deny must be an array: ${claudePath}`);
        const deny = [...(permissions.deny || [])];
        const overrides = { ...current.skillOverrides };
        if (names.length || agents.length) {
            if (spawnSync('git', ['check-ignore', '-q', '--', claudePath], { cwd: checkout, windowsHide: true }).status !== 0) {
                throw new Error(`Claude checkout settings must be git-ignored before applying ${effective.mode}: ${claudePath}`);
            }
            assertCodexAppendable(read(path.join(checkout, '.codex/config.toml')) || '');
            const state = saved || { claudeBefore: {}, claudeFileExisted: currentText !== null,
                claudeMemberExisted: own(current, 'skillOverrides'), codexPath: path.resolve(env.CODEX_HOME || path.join(homeDir, '.codex'), 'config.toml'), codexBlock: '' };
            state.agentDeny ||= [];
            state.permissionsMemberExisted ??= own(current, 'permissions');
            if (!plain(state.claudeBefore) || typeof state.codexPath !== 'string' || !path.isAbsolute(state.codexPath) || typeof state.codexBlock !== 'string' || !Array.isArray(state.agentDeny)) {
                throw new Error(`Invalid recovery state for ${checkout}`);
            }
            if (saved && state.codexPath !== path.resolve(env.CODEX_HOME || path.join(homeDir, '.codex'), 'config.toml')) {
                throw new Error(`Codex home changed while ${heldBy(state)}; restore on using the recorded home before applying ${effective.mode} in the new home: ${state.codexPath}`);
            }
            // The interim ledger keeps every key either run owns, so an interrupted
            // write never orphans a released override or deny rule.
            const ownedBefore = { claudeBefore: { ...state.claudeBefore }, agentDeny: [...state.agentDeny], codexBlock: state.codexBlock, codexBlockPrevious: state.codexBlockPrevious, value: state.value };
            // Rules an interrupted run recorded but may not have written yet.
            const pending = new Set(state.agentDenyPending || []);
            delete state.codexBlockPrevious;
            delete state.agentDenyPending;
            // A skill that joined quietSkills (or the gate's set) gets its prior policy back.
            // Values this ledger may have written before; a mode change (off and a quiet
            // restriction) swaps one owned value for the other.
            const ownedSkillValues = ownedValues(state);
            delete state.valuePrevious;
            for (const [name, previous] of Object.entries(state.claudeBefore)) {
                if (names.includes(name)) continue;
                release(overrides, name, previous, state, ownedSkillValues);
                delete state.claudeBefore[name];
            }
            for (const name of names) {
                if (own(overrides, name) && !['on', 'off', 'name-only', 'user-invocable-only'].includes(overrides[name])) {
                    throw new Error(`Invalid Claude override for ${name}: ${claudePath}`);
                }
                if (!own(state.claudeBefore, name)) state.claudeBefore[name] = own(overrides, name) ? overrides[name] : null;
                else if (!ownedSkillValues.includes(overrides[name]) && overrides[name] !== state.claudeBefore[name] && !(overrides[name] === undefined && state.claudeBefore[name] === null)) {
                    throw new Error(`Claude skill ${name} changed while ${heldBy(state)}; reconcile its local override before retrying.`);
                }
                overrides[name] = value;
            }
            state.value = value;
            // Own only the deny rules this ledger added; a user's own rule is never removed.
            const wanted = agents.map(name => `Agent(${name})`);
            const owned = new Set(state.agentDeny);
            // A removed owned rule is the user's change, as for skills.
            for (const rule of wanted) {
                if (owned.has(rule) && !pending.has(rule) && !deny.includes(rule)) throw new Error(`Claude agent rule ${rule} was removed while ${heldBy(state)}; reconcile ${claudePath} before retrying.`);
            }
            const nextDeny = deny.filter(rule => !(owned.has(rule) && !wanted.includes(rule)));
            const added = [];
            for (const rule of wanted) if (!nextDeny.includes(rule)) { nextDeny.push(rule); owned.add(rule); added.push(rule); }
            state.agentDeny = wanted.filter(rule => owned.has(rule));
            let text = spliceTopLevelMember(currentText ?? '{}\n', 'skillOverrides',
                Object.keys(overrides).length || state.claudeMemberExisted ? overrides : undefined);
            text = spliceTopLevelMember(text, 'permissions', withDeny(permissions, nextDeny, state.permissionsMemberExisted));
            set(claudePath, text);
            let codexText = stripCodexBlock(get(state.codexPath) ?? '', { ...state, codexBlockPrevious: ownedBefore.codexBlockPrevious });
            if (codexText === null) throw new Error(`Codex framework block changed: ${state.codexPath}`);
            const skills = entries.map(entry => path.join(checkout, '.agents', 'skills', entry.relative)).filter(target => fs.existsSync(target)).map(target => fs.realpathSync(target));
            if (entries.length && skills.length !== entries.length) throw new Error(`Codex mirrors are missing in ${checkout}; run sync-codex before applying ${effective.mode}.`);
            state.codexBlock = '';
            if (skills.length) {
                assertCodexAppendable(codexText);
                state.id ||= createHash('sha256').update(checkout).digest('hex').slice(0,16);
                state.codexFileExisted ??= get(state.codexPath) !== null;
                const prefix = `# CK:FRAMEWORK-SKILLS:${state.id}`;
                state.codexBlock = `${codexText && !codexText.endsWith('\n') ? '\n' : ''}${prefix}:START\n` +
                    skills.map(target => `[[skills.config]]\npath = ${JSON.stringify(target.replace(/\\/g, '/'))}\nenabled = false\n`).join('') + `${prefix}:END\n`;
                codexText += state.codexBlock;
            }
            if (saved || state.codexBlock) set(state.codexPath, state.codexFileExisted === false && codexText === '' ? null : codexText);
            entry.disabled = state;
            interim.projects[checkout] = { ...structuredClone(entry), disabled: { ...structuredClone(state),
                claudeBefore: { ...ownedBefore.claudeBefore, ...state.claudeBefore },
                agentDeny: [...new Set([...ownedBefore.agentDeny, ...state.agentDeny])],
                ...(added.length ? { agentDenyPending: added } : {}),
                ...(ownedBefore.value && ownedBefore.value !== state.value ? { valuePrevious: ownedBefore.value } : {}),
                ...(ownedBefore.codexBlock && ownedBefore.codexBlock !== state.codexBlock ? { codexBlockPrevious: ownedBefore.codexBlock } : {}) } };
        } else if (saved) {
            if (!plain(saved.claudeBefore) || typeof saved.codexBlock !== 'string' || typeof saved.codexPath !== 'string') throw new Error(`Invalid recovery state for ${checkout}`);
            for (const [name, previous] of Object.entries(saved.claudeBefore)) release(overrides, name, previous, saved);
            const value = Object.keys(overrides).length || saved.claudeMemberExisted ? overrides : undefined;
            let restored = spliceTopLevelMember(currentText ?? '{}\n', 'skillOverrides', value);
            if (saved.agentDeny?.length) {
                const owned = new Set(saved.agentDeny);
                restored = spliceTopLevelMember(restored, 'permissions', withDeny(permissions, deny.filter(rule => !owned.has(rule)), saved.permissionsMemberExisted));
            }
            if (!saved.claudeFileExisted && Object.keys(json(restored, claudePath)).length === 0) restored = null;
            set(claudePath, restored);
            const codexText = get(saved.codexPath);
            const restoredCodex = codexText === null ? null : stripCodexBlock(codexText, saved);
            if (codexText !== null && restoredCodex === null) throw new Error(`Codex framework block changed; preserved it: ${saved.codexPath}`);
            if (codexText !== null && restoredCodex !== codexText) set(saved.codexPath, saved.codexFileExisted === false && restoredCodex === '' ? null : restoredCodex);
            delete entry.disabled;
        }
        results.push({ root: checkout, mode: effective.mode, source: effective.source, skills: names.length, agents: agents.length,
            nativeSkills: value === OFF_VALUE ? 'disabled' : names.length || agents.length ? 'quiet-profile' : 'profile-restored', restartRequired: !!(names.length || agents.length || saved) });
    }
    const writes = [...changes.values()].filter(change => change.before !== change.after);
    for (const change of writes) {
        assertSettingsPath(change.file);
    }
    return { registryPath: file, registryBefore: read(file), interim, registry, changes: writes, results };
}

function applyNativeSkills(plan) {
    // An interrupted write is recoverable by `apply`: the interim ledger keeps
    // the original skill policy, and each restore accepts already-restored keys.
    for (const change of plan.changes) {
        if (read(change.file) !== change.before) throw new Error(`Settings changed during planning: ${change.file}`);
        assertSettingsPath(change.file);
    }
    if (read(plan.registryPath) !== plan.registryBefore) throw new Error('Native registry changed during planning; retry.');
    atomic(plan.registryPath, `${JSON.stringify(plan.interim, null, 2)}\n`);
    for (const change of plan.changes) atomic(change.file, change.after);
    atomic(plan.registryPath, `${JSON.stringify(plan.registry, null, 2)}\n`);
    return plan.results;
}

function nativeStatus(rootDir, homeDir = os.homedir(), env = process.env) {
    const root = fs.realpathSync(rootDir);
    const entry = loadRegistry(registryPath(homeDir)).projects[root];
    const state = entry?.disabled;
    const settings = json(read(path.join(root, '.claude/settings.local.json')), 'Claude local settings');
    const effective = resolveFrameworkMode({ rootDir: root, homeDir, env });
    const { value, skills, agents } = nativePolicy(root, effective, homeDir, env);
    const deny = Array.isArray(settings.permissions?.deny) ? settings.permissions.deny : [];
    const stale = !!state && Object.keys(state.claudeBefore || {}).some(name => !skills.some(entry => entry.name === name));
    const restricted = !!value && !!state && !stale && skills.every(({name}) => own(state.claudeBefore, name) && settings.skillOverrides?.[name] === value) &&
        agents.every(name => deny.includes(`Agent(${name})`)) &&
        (!state.codexBlock || (read(state.codexPath) || '').includes(state.codexBlock));
    // What the ledger applied, whatever the current mode: every framework skill natively off.
    const codexApplied = !state?.codexBlock || (read(state.codexPath) || '').includes(state.codexBlock);
    const skillsDisabled = !!state && (state.value || OFF_VALUE) === OFF_VALUE && codexApplied &&
        catalog(root).every(({name}) => own(state.claudeBefore, name) && settings.skillOverrides?.[name] === OFF_VALUE);
    return { registered: !!entry, restricted, skillsDisabled, recoveryPending: !!state && !restricted && !skillsDisabled,
        needsApply: value ? (skills.length + agents.length > 0 || !!state) && !restricted : !!state,
        registryPath: registryPath(homeDir), hosts: ['claude', 'codex'], restartRequired: true };
}

function withNativeLock(action, homeDir = os.homedir()) {
    const file = `${registryPath(homeDir)}.lock`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let fd;
    try { fd = fs.openSync(file, 'wx', 0o600); }
    catch (error) {
        if (error.code !== 'EEXIST') throw error;
        throw new Error(`Another framework-mode operation may be active. If its process has ended, remove this stale lock and retry: ${file}`);
    }
    try { fs.writeFileSync(fd, String(process.pid)); return action(); }
    finally { fs.closeSync(fd); fs.unlinkSync(file); }
}

module.exports = { planNativeSkills, applyNativeSkills, nativeStatus, registryPath, atomic, assertSettingsPath, assertCodexAppendable, withNativeLock };
