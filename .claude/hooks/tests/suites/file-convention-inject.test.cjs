'use strict';

/**
 * Per-file convention injection — spec docs/specs/ContextDelivery/README.PerFileConventionInjection.md §8.
 * Guards: explicit opt-in, class membership/ordering, deliver-only-what-is-missing (per working context,
 * condensation, version, distance, static credit), completed-delivery records, size budget, static parity,
 * additive setup merge, and never-block behaviour. Each test name starts with its TC id (spec join key).
 * Fixtures live in unique temp dirs and are removed in `finally`; the delivery store is always a fixture dir.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const HOOK = path.join(HOOKS_DIR, 'file-convention-inject.cjs');
const LOOKUP_CLI = path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs');
const MERGE_CLI = path.join(HOOKS_DIR, 'lib', 'convention-merge.cjs');
const conventions = require(LOOKUP_CLI);
const ledger = require(path.join(HOOKS_DIR, 'lib', 'convention-ledger.cjs'));
const merge = require(MERGE_CLI);
const schema = require(path.join(HOOKS_DIR, 'lib', 'project-config-schema.cjs'));
const hook = require(HOOK);
const builders = require(path.resolve(HOOKS_DIR, '..', 'skills', 'ai-context-refresh', 'scripts', 'section-builders.cjs'));

// Injected clock anchored to real time: session pruning compares `now` with real directory
// mtimes, so a clock far from wall time would make fresh fixture state look stale.
const NOW = Math.floor(Date.now() / 1000) * 1000;
const MINUTE = 60 * 1000;
const HOOKS_REGEX = '[\\\\/]\\.claude[\\\\/]hooks[\\\\/].*\\.cjs$';

// ── fixtures ────────────────────────────────────────────────────────────────

async function withFixture(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pfci-test-'));
    const fx = {
        root,
        project: path.join(root, 'project'),
        store: path.join(root, 'store'),
        transcripts: path.join(root, 'transcripts'),
        abs: rel => path.join(fx.project, ...rel.split('/')),
        write(rel, content = '') {
            const file = fx.abs(rel);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, content);
            return file;
        },
        writeConfig(config) {
            fx.write('docs/project-config.json', typeof config === 'string' ? config : JSON.stringify(config, null, 2));
        }
    };
    for (const dir of [path.join(fx.project, '.claude', 'hooks'), fx.store, fx.transcripts]) fs.mkdirSync(dir, { recursive: true });
    try {
        await fn(fx);
    } finally {
        ledger._resetCarrierCache();
        fs.rmSync(root, { recursive: true, force: true });
    }
}

function hooksGroup(extra = {}) {
    return { name: 'hooks-context', pathRegexes: [HOOKS_REGEX], fileExtensions: ['.cjs'], referenceDocs: ['docs/hooks-guide.md'], rules: ['Hooks use CommonJS'], ...extra };
}

function specGroup(extra = {}) {
    return {
        name: 'feature-spec', pathRegexes: [], pathGlobs: ['docs/specs/**/*.md'], priority: 100,
        referenceDocs: ['docs/ref/feature-spec-reference.md', 'docs/ref/spec-system-reference.md', 'docs/ref/spec-principles.md'],
        skills: ['spec'], ...extra
    };
}

function enabled(groups, settings = {}) {
    return { conventionInjection: { enabled: true, ...settings }, contextGroups: groups };
}

function entryOf(group) {
    return conventions.injectableEntries({ contextGroups: [group] })[0];
}

const tagOf = group => conventions.conventionTag(entryOf(group));
const hashOf = group => conventions.groupHash(entryOf(group));
const count = (text, needle) => text.split(needle).length - 1;

function post(fx, tool, rel, extra = {}) {
    const key = tool === 'NotebookEdit' ? 'notebook_path' : 'file_path';
    const target = path.isAbsolute(rel) ? rel : fx.abs(rel);
    return { hook_event_name: 'PostToolUse', tool_name: tool, session_id: 'session-1', cwd: fx.project, tool_input: { [key]: target }, ...extra };
}

function patch(fx, lines, extra = {}) {
    return {
        hook_event_name: 'PostToolUse', tool_name: 'apply_patch', session_id: 'session-1', cwd: fx.project,
        tool_input: { command: ['*** Begin Patch', ...lines, '*** End Patch'].join('\n') }, ...extra
    };
}

function contextOf(payload) {
    if (!payload) return '';
    const parsed = JSON.parse(payload);
    assert.deepEqual(Object.keys(parsed), ['hookSpecificOutput'], 'reminder output carries no decision fields');
    assert.deepEqual(Object.keys(parsed.hookSpecificOutput).sort(), ['additionalContext', 'hookEventName']);
    assert.equal(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
    return parsed.hookSpecificOutput.additionalContext;
}

/** In-process evaluation with an injected clock and a capturing writer. */
async function deliver(fx, config, input, deps = {}) {
    const payload = await hook.run(input, {
        env: { CK_CONVENTIONS_DIR: fx.store },
        projectDir: fx.project,
        config,
        now: NOW,
        write: (text, done) => done(true),
        ...deps
    });
    return contextOf(payload);
}

/** SessionStart with the switch explicitly on — the opt-in gate covers this event too. */
function sessionStart(fx, source, sessionId, now, config = enabled([hooksGroup()])) {
    return hook.run({ hook_event_name: 'SessionStart', source, session_id: sessionId }, { env: { CK_CONVENTIONS_DIR: fx.store }, config, now });
}

function spawnNode(args, { cwd, env = {}, stdin = '' }) {
    return new Promise(resolve => {
        const child = spawn(process.execPath, args, {
            cwd, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
            // Diagnostics switches default off so a developer's shell cannot turn silence assertions red.
            env: { ...process.env, CK_DEBUG: '', CLAUDE_HOOK_DEBUG: '', ...env }
        });
        let stdout = '';
        let stderr = '';
        const started = Date.now();
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('close', code => resolve({ code, stdout, stderr, ms: Date.now() - started }));
        child.stdin.on('error', () => {});
        child.stdin.end(stdin);
    });
}

function spawnHook(fx, input, { raw, env = {} } = {}) {
    return spawnNode([HOOK], {
        cwd: fx.project,
        env: { CLAUDE_PROJECT_DIR: fx.project, CK_CONVENTIONS_DIR: fx.store, ...env },
        stdin: raw !== undefined ? raw : JSON.stringify(input)
    });
}

function assertSilent(result, label) {
    assert.equal(result.code, 0, `${label}: exit 0`);
    assert.equal(result.stdout, '', `${label}: no output`);
    assert.equal(result.stderr, '', `${label}: no error text`);
}

function storeIsEmpty(fx) {
    return fs.readdirSync(fx.store).length === 0;
}

const DAY = 24 * 60 * MINUTE;

/** Write `rel` (with its parents) under `root`; returns the absolute file path. */
function plant(root, rel, content = '{}') {
    const file = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
}

/** Back-date a whole tree so retention sees it as untouched for `ageMs`. */
function backdate(target, ageMs) {
    const seconds = (Date.now() - ageMs) / 1000;
    const walk = item => {
        if (fs.statSync(item).isDirectory()) for (const name of fs.readdirSync(item)) walk(path.join(item, name));
        fs.utimesSync(item, seconds, seconds);
    };
    walk(target);
}

/** Deterministic seeded generator (no dependency). */
function seeded(seed) {
    let state = seed >>> 0;
    const next = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
    return { next, int: (min, max) => min + Math.floor(next() * (max - min + 1)), pick: list => list[Math.floor(next() * list.length)] };
}

function validationDelta(extra) {
    const base = { schemaVersion: 2 };
    const baseline = schema.validateConfig(base);
    const result = schema.validateConfig({ ...base, ...extra });
    return {
        errors: result.errors.filter(e => !baseline.errors.includes(e)),
        warnings: result.warnings.filter(w => !baseline.warnings.includes(w))
    };
}

function appendBytes(file, bytes) {
    fs.appendFileSync(file, 'x'.repeat(bytes));
}

const tests = [
    // TC-PFCI-001: Reading a file of a class delivers its conventions
    {
        name: 'TC-PFCI-001 read delivers digest',
        fn: async () => withFixture(async fx => {
            // Given delivery is on and "hooks-context" has a rule and a reference document
            const group = hooksGroup();
            fx.writeConfig(enabled([group]));
            fx.write('.claude/hooks/example-hook.cjs', 'module.exports = {};');
            // When the assistant finishes reading a hook source file (real hook process)
            const result = await spawnHook(fx, post(fx, 'Read', '.claude/hooks/example-hook.cjs'));
            // Then a reminder names the class, its reference document and its rule, and nothing else is decided
            assert.equal(result.code, 0);
            assert.equal(result.stderr, '');
            const context = contextOf(result.stdout);
            assert.ok(context.startsWith('[conventions] .claude/hooks/example-hook.cjs — MUST read first: docs/hooks-guide.md'), context);
            assert.ok(context.includes(`${tagOf(group)} hooks-context (priority 500)`));
            assert.ok(context.includes('- Hooks use CommonJS'));
            // And the conversation now counts the class as reminded at the current version
            const record = ledger.readRecord(fx.store, 'session-1', 'main', 'hooks-context');
            assert.equal(record.hash, hashOf(group));
            assert.equal(record.form, 'full');
            // Edge: a file of a kind with no class → no reminder
            fx.write('docs/readme.txt', 'x');
            assertSilent(await spawnHook(fx, post(fx, 'Read', 'docs/readme.txt', { session_id: 'session-2' })), 'unclassified file');
        })
    },

    // TC-PFCI-002: Changing a file of a class delivers its conventions
    {
        name: 'TC-PFCI-002 edit delivers digest',
        fn: async () => withFixture(async fx => {
            // Given "feature-spec" lists a protocol and three reference documents
            const group = specGroup();
            fx.writeConfig(enabled([group]));
            fx.write('.claude/skills/spec/SKILL.md', '# spec');
            const created = fx.write('docs/specs/Bucket/README.Feature.md', '# Feature');
            // When the assistant successfully creates a feature spec document
            const input = post(fx, 'Write', created);
            const first = await spawnHook(fx, input);
            // Then the reminder names the protocol reference and every reference document
            const context = contextOf(first.stdout);
            assert.ok(context.includes('follow skill protocol: .claude/skills/spec/SKILL.md'), context);
            for (const doc of group.referenceDocs) assert.ok(context.includes(`- read: ${doc}`), doc);
            assert.ok(context.includes(tagOf(group)));
            // Edge: the same change repeated immediately → no second reminder
            assertSilent(await spawnHook(fx, input), 'repeat');
        })
    },

    // TC-PFCI-003: A multi-file change combines the classes of all touched files
    {
        name: 'TC-PFCI-003 codex patch targets union',
        fn: async () => withFixture(async fx => {
            // Given classes "hooks-context" and "feature-spec"
            const hooks = hooksGroup();
            const spec = specGroup();
            fx.writeConfig(enabled([hooks, spec]));
            const input = patch(fx, [
                '*** Add File: docs/specs/B/README.F.md', '+# F',
                '*** Update File: .claude/hooks/x.cjs', '@@', '+x',
                '*** Delete File: .claude/hooks/old.cjs'
            ]);
            // When one patch adds a spec, updates a hook and deletes another file
            assert.deepEqual(conventions.extractTargets(input, fx.project), ['docs/specs/B/README.F.md', '.claude/hooks/x.cjs']);
            const result = await spawnHook(fx, input);
            // Then exactly one section per class, in precedence order, and the removal contributes nothing
            const context = contextOf(result.stdout);
            assert.equal(count(context, '[[convention:feature-spec@'), 1);
            assert.equal(count(context, '[[convention:hooks-context@'), 1);
            assert.ok(context.indexOf(tagOf(spec)) < context.indexOf(tagOf(hooks)));
            // And the reminder names the first touched file and counts the other one (the removal is not counted)
            assert.ok(context.split('\n')[0].startsWith('[conventions] docs/specs/B/README.F.md (+1 more) — '), context);
            // And both classes are now recorded as reminded
            assert.ok(ledger.readRecord(fx.store, 'session-1', 'main', 'feature-spec'));
            assert.ok(ledger.readRecord(fx.store, 'session-1', 'main', 'hooks-context'));
            // Edge: a move into a class location → only the destination counts (the source no longer exists)
            const moved = patch(fx, ['*** Update File: notes/a.txt', '*** Move to: .claude/hooks/moved.cjs'], { session_id: 'session-move' });
            assert.deepEqual(conventions.extractTargets(moved, fx.project), ['.claude/hooks/moved.cjs']);
            // And the destination's class reminder is actually delivered
            const movedContext = contextOf((await spawnHook(fx, moved)).stdout);
            assert.equal(count(movedContext, '[[convention:hooks-context@'), 1, movedContext);
            // Edge: a move out of a class location → the former location's class is not reminded
            const movedOut = patch(fx, ['*** Update File: .claude/hooks/leaving.cjs', '@@', '+x', '*** Move to: notes/left.txt', '*** Add File: .claude/hooks/new.cjs', '+y'], { session_id: 'session-move-out' });
            assert.deepEqual(conventions.extractTargets(movedOut, fx.project), ['notes/left.txt', '.claude/hooks/new.cjs']);
            assert.deepEqual(conventions.extractTargets(patch(fx, ['*** Update File: .claude/hooks/leaving.cjs', '*** Move to: notes/left.txt'], { session_id: 'session-move-only' }), fx.project), ['notes/left.txt']);
            assertSilent(await spawnHook(fx, patch(fx, ['*** Update File: .claude/hooks/leaving.cjs', '*** Move to: notes/left.txt'], { session_id: 'session-move-only' })), 'moved out of class');
        })
    },

    // TC-PFCI-004: Convention lookup prints what delivery would show
    {
        name: 'TC-PFCI-004 lookup equals delivered digest',
        fn: async () => withFixture(async fx => {
            // Given several classes match a hook source file
            fx.writeConfig(enabled([hooksGroup(), { name: 'general-code', pathRegexes: [], pathGlobs: ['**/*'], priority: 900, rules: ['Keep functions small'] }]));
            fx.write('.claude/hooks/example-hook.cjs');
            const env = { CLAUDE_PROJECT_DIR: fx.project };
            // When the lookup is run for that file
            const lookup = await spawnNode([LOOKUP_CLI, '--lookup', fx.abs('.claude/hooks/example-hook.cjs')], { cwd: fx.project, env });
            assert.equal(lookup.code, 0, lookup.stderr);
            // Then the lookup never touches delivery memory
            assert.ok(storeIsEmpty(fx), 'lookup writes no delivery record');
            // And a fresh-conversation delivery shows the same sections in the same order with the same text
            const delivered = contextOf((await spawnHook(fx, post(fx, 'Read', '.claude/hooks/example-hook.cjs'))).stdout);
            assert.equal(lookup.stdout, `${delivered}\n`);
            assert.ok(delivered.indexOf('hooks-context') < delivered.indexOf('general-code'));
            // Edge: a file matching no class → lookup reports no conventions
            fx.writeConfig(enabled([hooksGroup()]));
            const none = await spawnNode([LOOKUP_CLI, '--lookup', 'docs/x.txt'], { cwd: fx.project, env });
            assert.equal(none.stdout.trim(), '[conventions] No convention classes match docs/x.txt');
            assert.equal(none.stderr, '', 'delivery on: no delivery note');
            // Edge: the machine-readable lookup states whether automatic delivery would run
            const json = JSON.parse((await spawnNode([LOOKUP_CLI, '--lookup', '.claude/hooks/example-hook.cjs', '--json'], { cwd: fx.project, env })).stdout);
            assert.deepEqual([json.rel, json.enabled, json.onRead, json.classes.map(c => c.name)], ['.claude/hooks/example-hook.cjs', true, true, ['hooks-context']]);
            // Edge: delivery off → same lookup text, plus a note on the diagnostic stream only
            fx.writeConfig({ contextGroups: [hooksGroup()], conventionInjection: { onRead: false } });
            const off = await spawnNode([LOOKUP_CLI, '--lookup', '.claude/hooks/example-hook.cjs'], { cwd: fx.project, env });
            assert.equal(off.code, 0);
            assert.ok(off.stdout.includes('[[convention:hooks-context@'), off.stdout);
            assert.ok(off.stderr.includes('automatic delivery is off'), off.stderr);
            const offJson = JSON.parse((await spawnNode([LOOKUP_CLI, '--lookup', '.claude/hooks/example-hook.cjs', '--json'], { cwd: fx.project, env })).stdout);
            assert.deepEqual([offJson.enabled, offJson.onRead], [false, false]);
            // Edge: no path given → usage text and exit code 2
            const usage = await spawnNode([LOOKUP_CLI, '--lookup'], { cwd: fx.project, env });
            assert.equal(usage.code, 2);
            assert.ok(usage.stdout.startsWith('Usage: '), usage.stdout);
        })
    },

    // TC-PFCI-005: Static instructions list every deliverable class
    {
        name: 'TC-PFCI-005 static table renders every injectable group',
        fn: () => {
            // Given a class with only rules and a protocol, a class with a guide document, and a styling-only class
            const mirrors = { name: 'generated-mirrors', pathRegexes: [], pathGlobs: ['.agents/**'], rules: ['Never hand-edit'], skills: ['spec'] };
            const guide = { name: 'hooks-context', pathRegexes: [], pathGlobs: ['.claude/hooks/*.cjs'], guideDoc: '.claude/docs/hooks/README.md' };
            const styles = { name: 'styles', pathRegexes: [], pathGlobs: ['**/*.scss'], stylingDoc: 'docs/styling.md' };
            const config = { contextGroups: [mirrors, guide, styles] };
            // When the static instructions are regenerated
            const table = builders.buildSkillActivation(config);
            const golden = builders.buildGoldenRules(config);
            // Then the rules-only class has a row with its patterns, protocol reference and tag
            const mirrorRow = table.split('\n').find(line => line.includes(tagOf(mirrors)));
            assert.ok(mirrorRow && mirrorRow.includes('`.agents/**`') && mirrorRow.includes('`spec`'), table);
            assert.ok(golden.includes('Never hand-edit'));
            // And the guide-document class lists the guide as a reference document
            const guideRow = table.split('\n').find(line => line.includes(tagOf(guide)));
            assert.ok(guideRow && guideRow.includes('`.claude/docs/hooks/README.md`'), table);
            // And the non-deliverable class is not rendered; the hookless lookup is named
            assert.ok(!table.includes('styles') && !table.includes('**/*.scss'));
            assert.ok(table.includes(conventions.LOOKUP_COMMAND));
            // Edge: a row states the file-type filter and the exclusions, so it never claims files the class skips
            const filtered = { name: 'general-code', pathRegexes: [], pathGlobs: ['**/*'], fileExtensions: ['cjs', '.JS'], excludePathGlobs: ['tmp/**'], excludePathRegexes: ['[\\\\/]dist[\\\\/]'], rules: ['General'] };
            const filteredRow = builders.buildSkillActivation({ contextGroups: [filtered] }).split('\n').find(line => line.includes(tagOf(filtered)));
            assert.ok(filteredRow.startsWith('| `**/*` ext `.cjs`, `.js` · not `/dist/**`, `tmp/**` |'), filteredRow);
        }
    },

    // TC-PFCI-011: A well-formed class definition is accepted
    {
        name: 'TC-PFCI-011 valid group forms accepted',
        fn: () => {
            // Given classes using each include form, plus the historical regex-only shape
            const forms = [
                { name: 'feature-spec', pathRegexes: [], pathGlobs: ['docs/specs/**/*.md'], referenceDocs: ['docs/project-reference/feature-spec-reference.md'] },
                { name: 'regex-only', pathRegexes: ['/src/'], rules: ['r'] },
                { name: 'file-name-only', pathRegexes: [], fileNameRegexes: ['\\.test\\.cjs$'], skills: ['integration-test'], priority: 100, origin: 'detected', detectedFingerprint: 'abc' },
                { name: 'legacy', pathRegexes: ['src[\\\\/]'] }
            ];
            for (const group of forms) {
                // When the configuration is validated
                const delta = validationDelta({ contextGroups: [group] });
                // Then validation adds no error and no warning
                assert.deepEqual(delta, { errors: [], warnings: [] }, group.name);
            }
            assert.deepEqual(validationDelta({ contextGroups: forms, conventionInjection: { enabled: true, onRead: false, compactionMarkers: ['compact'] } }), { errors: [], warnings: [] });
            // Counter-case: the path-pattern list itself must be present (it may be empty)
            const { pathRegexes: omitted, ...withoutList } = forms[0];
            assert.deepEqual(omitted, []);
            const missing = validationDelta({ contextGroups: [withoutList] }).errors;
            assert.ok(missing.some(e => e.includes('"feature-spec"') && e.includes('pathRegexes')), missing.join(' | '));
        }
    },

    // TC-PFCI-012: Invalid class definitions are rejected by name
    {
        name: 'TC-PFCI-012 invalid groups rejected',
        fn: () => {
            const valid = { name: 'hooks-context', pathRegexes: [HOOKS_REGEX], rules: ['r'] };
            // Boundary counter-case: one valid include and a unique name → passes
            assert.deepEqual(validationDelta({ contextGroups: [valid] }).errors, []);
            const defects = [
                ['duplicate name', [valid, { ...valid }]],
                ['no include matcher', [{ ...valid, pathRegexes: [] }]],
                ['malformed path regex', [{ ...valid, pathRegexes: ['(unclosed'] }]],
                ['malformed file-name regex', [{ ...valid, fileNameRegexes: ['[bad'] }]],
                ['malformed exclude regex', [{ ...valid, excludePathRegexes: ['*bad'] }]]
            ];
            for (const [label, groups] of defects) {
                // Given a class with the defect / When validated
                const { errors } = validationDelta({ contextGroups: groups });
                // Then validation fails and an error names the class
                assert.ok(errors.length > 0, `${label}: rejected`);
                assert.ok(errors.some(e => e.includes('"hooks-context"')), `${label}: names the class — ${errors.join(' | ')}`);
            }
            // A blank or missing name cannot name the class → the error names its list position instead
            assert.ok(validationDelta({ contextGroups: [valid, { ...valid, name: '  ' }] }).errors.some(e => e.startsWith('contextGroups[1].name:') && e.includes('must not be blank')));
            const { name: absentName, ...nameless } = valid;
            assert.equal(absentName, 'hooks-context');
            assert.ok(validationDelta({ contextGroups: [nameless] }).errors.some(e => e.startsWith('contextGroups[0].name:')), 'missing name rejected by position');
            // Edges: unknown field and non-whole rank → warnings only
            const soft = validationDelta({ contextGroups: [{ ...valid, colour: 'red', priority: 1.5 }] });
            assert.deepEqual(soft.errors, []);
            assert.equal(soft.warnings.length, 2, soft.warnings.join(' | '));
        }
    },

    // TC-PFCI-013: Out-of-range delivery settings are rejected
    {
        name: 'TC-PFCI-013 settings ranges validated',
        fn: () => {
            const outside = { maxChars: [499, 10001, 1.5], maxClassesPerEdit: [0, 11], reinjectAfterBytes: [49999], reinjectAfterMinutes: [0, 1441], blindReinjectAfterMinutes: [0, 1441] };
            const edges = { maxChars: [500, 10000], maxClassesPerEdit: [1, 10], reinjectAfterBytes: [50000, Number.MAX_SAFE_INTEGER], reinjectAfterMinutes: [1, 1440], blindReinjectAfterMinutes: [1, 1440] };
            for (const [field, values] of Object.entries(outside)) {
                for (const value of values) {
                    // Given one setting just outside its range / When validated / Then an error names that setting and its range
                    const { errors } = validationDelta({ conventionInjection: { enabled: true, [field]: value } });
                    const [min, max] = conventions.RANGES[field];
                    const rangeText = max === Number.MAX_SAFE_INTEGER ? `at least ${min}` : `from ${min} through ${max}`;
                    assert.ok(errors.some(e => e.startsWith(`conventionInjection.${field}:`) && e.includes(rangeText)), `${field}=${value} rejected with range — ${errors.join(' | ')}`);
                }
            }
            for (const [field, values] of Object.entries(edges)) {
                for (const value of values) {
                    assert.deepEqual(validationDelta({ conventionInjection: { enabled: true, [field]: value } }).errors, [], `${field}=${value} accepted`);
                }
            }
            // And validation and runtime agree: the probed edges are exactly the runtime ranges, an accepted
            // value is applied, a rejected one falls back to the default, and the schema description matches
            assert.deepEqual(Object.keys(edges), Object.keys(conventions.RANGES));
            const description = schema.describeSchema();
            for (const [field, [min, max]] of Object.entries(conventions.RANGES)) {
                const unbounded = max === Number.MAX_SAFE_INTEGER;
                assert.deepEqual(edges[field], [min, max], `${field} edges (an unbounded upper limit is probed at the largest safe integer)`);
                assert.ok(outside[field].includes(min - 1) && (unbounded || outside[field].includes(max + 1)), `${field} outside`);
                const span = unbounded ? `>=${min}` : `${min}..${max}`;
                assert.ok(description.includes(`${field} ${span} (${conventions.DEFAULTS[field]})`), `${field} described`);
            }
            for (const [field, values] of Object.entries(edges)) {
                for (const value of values) assert.equal(conventions.resolveSettings({ conventionInjection: { [field]: value } })[field], value, `${field}=${value} applied`);
            }
            for (const [field, values] of Object.entries(outside)) {
                for (const value of values) assert.equal(conventions.resolveSettings({ conventionInjection: { [field]: value } })[field], conventions.DEFAULTS[field], `${field}=${value} ignored`);
            }
            // And every range-checked setting is a DECLARED property, not an unknown field the validator
            // merely tolerates: declaring it is what makes a typo of it a warning instead of silence
            for (const field of Object.keys(conventions.RANGES)) {
                const [min] = conventions.RANGES[field];
                assert.deepEqual(validationDelta({ conventionInjection: { enabled: true, [field]: min } }).warnings, [], `${field} declared`);
            }
            assert.ok(validationDelta({ conventionInjection: { enabled: true, blindReinjectAfterMinute: 5 } }).warnings.length, 'a typo of a setting is warned about');
            // Edge: settings absent → valid, delivery off, and the section is never required
            assert.ok(!schema.getRequiredSections().includes('conventionInjection'));
            assert.equal(conventions.resolveSettings({}).enabled, false);
        }
    },

    // TC-PFCI-014: An exclude pattern removes a file from its class
    {
        name: 'TC-PFCI-014 exclude wins',
        fn: async () => withFixture(async fx => {
            // Given "hooks-context" includes hook sources and excludes the hook tests folder
            const config = enabled([hooksGroup({ excludePathGlobs: ['.claude/hooks/tests/**'] })]);
            // When a hook test file is changed / Then no section is delivered
            assert.equal(await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/tests/suites/a.test.cjs')), '');
            assert.equal(ledger.readRecord(fx.store, 'session-1', 'main', 'hooks-context'), null);
            // Counter-case: a non-excluded hook source is delivered
            assert.ok((await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/a.cjs'))).includes('hooks-context'));
            // Edge: exclusion by location pattern behaves the same as by wildcard
            assert.equal(conventions.groupMatches(hooksGroup({ excludePathRegexes: ['/\\.claude/hooks/tests/'] }), '.claude/hooks/tests/suites/a.test.cjs'), false);
        })
    },

    // TC-PFCI-015: The file-type filter must also accept the file
    {
        name: 'TC-PFCI-015 extension filter conjunct',
        fn: async () => withFixture(async fx => {
            // Given a class whose location matches the whole hooks folder but whose filter accepts script files only
            const config = enabled([{ name: 'hooks-context', pathRegexes: [], pathGlobs: ['.claude/hooks/**'], fileExtensions: ['.cjs'], rules: ['Hooks use CommonJS'] }]);
            // When a markdown note in that folder is read / Then nothing is delivered
            assert.equal(await deliver(fx, config, post(fx, 'Read', '.claude/hooks/NOTES.md')), '');
            // And a script whose type is written in upper case is still reminded
            assert.ok((await deliver(fx, config, post(fx, 'Read', '.claude/hooks/LOUD.CJS'))).includes('hooks-context'));
            // Edge: a file with no type and a filter present → not a member
            assert.equal(conventions.groupMatches(config.contextGroups[0], '.claude/hooks/Makefile'), false);
        })
    },

    // TC-PFCI-016: Removals, outside-project files, folders and failed operations are ignored
    {
        name: 'TC-PFCI-016 ignores outside and delete targets',
        fn: async () => withFixture(async fx => {
            const config = enabled([{ name: 'general-code', pathRegexes: [], pathGlobs: ['**/*'], rules: ['General rule'] }]);
            const outside = path.join(fx.root, 'other-repo', 'x.cjs');
            fs.mkdirSync(path.dirname(outside), { recursive: true });
            fs.writeFileSync(outside, '');
            // Scenario: file outside the project → nothing
            assert.equal(await deliver(fx, config, post(fx, 'Read', outside, { session_id: 's-outside' })), '');
            // Scenario: removal only → nothing
            assert.equal(await deliver(fx, config, patch(fx, ['*** Delete File: .claude/hooks/old.cjs'], { session_id: 's-delete' })), '');
            // Scenario: folder read → nothing
            assert.equal(await deliver(fx, config, post(fx, 'Read', '.claude/hooks', { session_id: 's-folder' })), '');
            // Scenario: host reports the change failed → nothing and not counted as reminded
            assert.equal(await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/x.cjs', { session_id: 's-failed', tool_response: { success: false } })), '');
            assert.equal(ledger.readRecord(fx.store, 's-failed', 'main', 'general-code'), null);
            // Counter-case: the same change reported without failure is delivered
            assert.ok((await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/x.cjs', { session_id: 's-ok', tool_response: { success: true } }))).includes('general-code'));
            // Edge: parent-directory segments resolving inside the project → evaluated normally
            assert.ok((await deliver(fx, config, post(fx, 'Edit', fx.abs('.claude/hooks/../hooks/y.cjs'), { session_id: 's-dots' }))).includes('.claude/hooks/y.cjs'));
        })
    },

    // TC-PFCI-017: Reading can be excluded as a trigger
    {
        name: 'TC-PFCI-017 onRead false skips reads',
        fn: async () => withFixture(async fx => {
            // Given the read trigger is off
            const config = enabled([hooksGroup()], { onRead: false });
            // When a hook source file is read / Then nothing is shown and nothing recorded
            assert.equal(await deliver(fx, config, post(fx, 'Read', '.claude/hooks/a.cjs')), '');
            assert.equal(ledger.readRecord(fx.store, 'session-1', 'main', 'hooks-context'), null);
            // When it is then changed / Then the reminder is shown
            assert.ok((await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/a.cjs'))).includes('hooks-context'));
            // Edge: read trigger setting absent → reads deliver
            assert.ok((await deliver(fx, enabled([hooksGroup()]), post(fx, 'Read', '.claude/hooks/a.cjs', { session_id: 'session-2' }))).includes('hooks-context'));
        })
    },

    // TC-PFCI-018: A class without deliverable items is never delivered
    {
        name: 'TC-PFCI-018 non-injectable group skipped',
        fn: async () => withFixture(async fx => {
            const items = { rules: ['r'], skills: ['spec'], referenceDocs: ['docs/a.md'], stylingDoc: 'docs/styling.md', designSystemDoc: 'docs/ds.md' };
            const keys = Object.keys(items);
            // Property over all 32 presence combinations: deliverable iff a rule, protocol or reference document is present
            for (let mask = 0; mask < 1 << keys.length; mask++) {
                const group = { name: 'styles', pathRegexes: [], pathGlobs: ['**/*.scss'] };
                keys.forEach((key, bit) => { if (mask & (1 << bit)) group[key] = items[key]; });
                const expected = Boolean(group.rules || group.skills || group.referenceDocs);
                assert.equal(conventions.isInjectable(group), expected, JSON.stringify(group));
                assert.equal(conventions.matchGroups(enabled([group]), ['a/b.scss']).length, expected ? 1 : 0);
            }
            // Given a styling-only class / When a matched stylesheet changes / Then no reminder
            const stylingOnly = { name: 'styles', pathRegexes: [], pathGlobs: ['**/*.scss'], stylingDoc: 'docs/styling.md' };
            assert.equal(await deliver(fx, enabled([stylingOnly]), post(fx, 'Edit', 'src/a.scss')), '');
            // Counter-case: only a reference document → reminded
            assert.ok((await deliver(fx, enabled([{ ...stylingOnly, referenceDocs: ['docs/a.md'] }]), post(fx, 'Edit', 'src/a.scss', { session_id: 'session-2' }))).includes('- read: docs/a.md'));
        })
    },

    // TC-PFCI-024: A maintainer class differing only by case is the same class; odd e2e framework shapes never throw
    {
        name: 'TC-PFCI-024 merge matches names case-insensitively and tolerates non-string e2e framework',
        fn: async () => {
            // Given a maintainer "Backend" class and a detected "backend" class
            const maintainer = { name: 'Backend', pathRegexes: ['src[\\\\/]'], rules: ['Maintainer rule'] };
            const detected = { name: 'backend', priority: 500, pathRegexes: ['Services[\\\\/]'], referenceDocs: ['docs/b.md'] };
            // When merged
            const result = merge.mergeDetected([maintainer], [detected]);
            // Then no duplicate is added and the maintainer class stays byte-identical
            assert.deepEqual(result.added, []);
            assert.deepEqual(result.kept, ['backend']);
            assert.equal(result.groups.length, 1);
            assert.deepEqual(result.groups[0], maintainer);
            // And detection survives an array or non-string e2eTesting.framework instead of throwing
            for (const framework of [['playwright'], ['none'], 42, null]) {
                assert.doesNotThrow(() => merge.detectGroups({ e2eTesting: { framework, testsPath: 'e2e' } }, { fileExists: () => true }), String(framework));
            }
            const none = merge.detectGroups({ e2eTesting: { framework: ['None'], testsPath: 'e2e' } }, { fileExists: () => true });
            assert.ok(!none.some(g => g.name === 'e2e-test'), 'framework none is not detected');
        }
    },
    // TC-PFCI-021: Setup adds a newly detected class
    {
        name: 'TC-PFCI-021 merge adds detected group',
        fn: async () => withFixture(async fx => {
            // Given no "feature-spec" class and a spec root whose reference documents exist
            const specDocs = ['feature-spec-reference.md', 'spec-system-reference.md', 'spec-principles.md'].map(f => `docs/project-reference/${f}`);
            for (const doc of specDocs) fx.write(doc, '# doc');
            fx.write('.claude/skills/spec/SKILL.md', '# spec');
            const config = { specRoots: { business: { path: 'docs/specs' } }, contextGroups: [hooksGroup()] };
            fx.writeConfig(config);
            // When detection results are merged
            const detected = merge.detectGroups(config, { projectDir: fx.project });
            const result = merge.mergeDetected(config.contextGroups, detected);
            // Then "feature-spec" is added, marked detected, with a matching fingerprint
            assert.deepEqual(result.added, ['feature-spec']);
            const added = result.groups.find(g => g.name === 'feature-spec');
            assert.equal(added.origin, 'detected');
            assert.equal(added.detectedFingerprint, merge.fingerprintGroup(added));
            assert.deepEqual(added.referenceDocs, specDocs);
            assert.deepEqual(added.skills, ['spec']);
            assert.deepEqual(validationDelta({ contextGroups: result.groups }), { errors: [], warnings: [] });
            // And the CLI dry run proposes it without writing the configuration
            const before = fs.readFileSync(fx.abs('docs/project-config.json'), 'utf8');
            const dry = await spawnNode([MERGE_CLI, '--detect', '--merge', '--config', fx.abs('docs/project-config.json')], { cwd: fx.project, env: { CLAUDE_PROJECT_DIR: fx.project } });
            assert.equal(dry.code, 0, dry.stderr);
            assert.deepEqual(JSON.parse(dry.stdout).added, ['feature-spec']);
            assert.equal(fs.readFileSync(fx.abs('docs/project-config.json'), 'utf8'), before);
            // Edge: a referenced document missing on disk → left out, the class is still proposed
            const partial = merge.detectGroups(config, { projectDir: fx.project, fileExists: rel => rel !== specDocs[1] });
            assert.deepEqual(partial.map(g => g.name), ['feature-spec']);
            assert.deepEqual(partial[0].referenceDocs, [specDocs[0], specDocs[2]]);
            // Edge: the protocol missing on disk → left out, the class is still proposed with its documents
            const noSkill = merge.detectGroups(config, { projectDir: fx.project, fileExists: rel => rel !== '.claude/skills/spec/SKILL.md' });
            assert.deepEqual(noSkill.map(g => [g.name, g.skills, g.referenceDocs]), [['feature-spec', undefined, specDocs]]);
            // Edge: nothing deliverable left on disk → class not proposed
            assert.deepEqual(merge.detectGroups(config, { projectDir: fx.project, fileExists: () => false }), []);
            // And one class is proposed per configured kind, from existing configuration only
            const rich = {
                specRoots: { business: { path: 'docs/specs' } },
                testing: { filePatterns: { integration: '*.int.test.ts', unit: '*.spec.ts' }, guideDoc: 'docs/testing.md' },
                framework: { integrationTestDoc: 'docs/int.md', e2eTestDoc: 'docs/e2e.md', backendPatternsDoc: 'docs/be.md', frontendPatternsDoc: 'docs/fe.md', codeReviewDoc: 'docs/review.md' },
                e2eTesting: { framework: 'playwright', testsPath: 'e2e/tests' },
                modules: [{ kind: 'backend-service', pathRegex: 'src/api/' }, { kind: 'frontend-app', pathRegex: 'src/web/' }],
                styling: { fileExtensions: ['.scss'], guideDoc: 'docs/styles.md' },
                project: { languages: ['TypeScript'] }
            };
            const byName = Object.fromEntries(merge.detectGroups(rich, { projectDir: fx.project, fileExists: () => true }).map(g => [g.name, g]));
            // Each proposed class carries exactly its kind's patterns, rank band, documents and protocols
            const excludes = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/vendor/**', 'tmp/**', 'temp/**'];
            assert.deepEqual(byName, {
                'feature-spec': { name: 'feature-spec', pathRegexes: [], priority: 100, pathGlobs: ['docs/specs/**/*.md'], referenceDocs: specDocs, skills: ['spec'] },
                'integration-test': { name: 'integration-test', pathRegexes: [], priority: 100, pathGlobs: ['**/*.int.test.ts'], referenceDocs: ['docs/int.md'], skills: ['integration-test'] },
                'e2e-test': { name: 'e2e-test', pathRegexes: [], priority: 100, pathGlobs: ['e2e/tests/**'], referenceDocs: ['docs/e2e.md'], skills: ['e2e-test'] },
                test: { name: 'test', pathRegexes: [], priority: 100, pathGlobs: ['**/*.spec.ts'], referenceDocs: ['docs/testing.md'] },
                backend: { name: 'backend', pathRegexes: ['src/api/'], priority: 500, referenceDocs: ['docs/be.md'] },
                frontend: { name: 'frontend', pathRegexes: ['src/web/'], priority: 500, referenceDocs: ['docs/fe.md'] },
                styling: { name: 'styling', pathRegexes: [], priority: 500, pathGlobs: ['**/*'], excludePathGlobs: excludes, fileExtensions: ['.scss'], referenceDocs: ['docs/styles.md'] },
                'general-code': { name: 'general-code', pathRegexes: [], priority: 900, pathGlobs: ['**/*'], excludePathGlobs: excludes, fileExtensions: ['.ts', '.tsx', '.mts', '.cts'], referenceDocs: ['docs/review.md'] }
            });
            assert.deepEqual(Object.keys(byName), ['feature-spec', 'integration-test', 'e2e-test', 'test', 'backend', 'frontend', 'styling', 'general-code']);
            // And general classes skip dependency and build output anywhere, and temporary output only at the project root
            const general = byName['general-code'];
            for (const [rel, member] of [['src/a.ts', true], ['node_modules/x/a.ts', false], ['pkg/dist/a.ts', false], ['build/a.ts', false], ['lib/vendor/x/a.ts', false],
                ['tmp/scratch.ts', false], ['temp/a.ts', false], ['pkg/tmp/a.ts', true], ['src/temp/a.ts', true]]) {
                assert.equal(conventions.groupMatches(general, rel), member, rel);
            }
        })
    },

    // TC-PFCI-022: Setup never changes maintainer classes or edited detected classes
    {
        name: 'TC-PFCI-022 merge keeps user and edited groups',
        fn: async () => withFixture(async fx => {
            // Given a maintainer "feature-spec" and a detected "integration-test" edited since detection
            const maintainer = { name: 'feature-spec', pathRegexes: [], pathGlobs: ['specs/**'], rules: ['Hand-written rule'] };
            const detectedOriginal = { name: 'integration-test', pathRegexes: [], pathGlobs: ['tests/**'], skills: ['integration-test'] };
            const edited = { ...detectedOriginal, origin: 'detected', detectedFingerprint: merge.fingerprintGroup(detectedOriginal), rules: ['Maintainer addition'] };
            const noOrigin = { name: 'general-code', pathRegexes: [], pathGlobs: ['**/*'], referenceDocs: ['docs/mine.md'] };
            const existing = [maintainer, edited, noOrigin];
            const snapshot = JSON.parse(JSON.stringify(existing));
            // When detection results reusing their names are merged
            const detected = [
                { name: 'feature-spec', pathRegexes: [], pathGlobs: ['docs/specs/**/*.md'], skills: ['spec'] },
                { name: 'integration-test', pathRegexes: [], pathGlobs: ['tests/**', 'more/**'], skills: ['integration-test'] },
                { name: 'general-code', pathRegexes: [], pathGlobs: ['**/*'], referenceDocs: ['docs/detected.md'] }
            ];
            const result = merge.mergeDetected(existing, detected);
            // Then every class is identical to before, reported kept, and the input was not mutated
            assert.deepEqual(result.groups, snapshot);
            assert.deepEqual(result.kept.sort(), ['feature-spec', 'general-code', 'integration-test']);
            assert.deepEqual(result.added, []);
            assert.deepEqual(result.refreshed, []);
            assert.deepEqual(existing, snapshot);
            // And setup never overrides the maintainer's delivery switch
            fx.write('docs/project-reference/integration-test-reference.md', '# ref');
            const cliConfig = extra => ({ testing: { filePatterns: { integration: '*.test.cjs' } }, framework: { integrationTestDoc: 'docs/project-reference/integration-test-reference.md' }, ...extra });
            const runSetup = async (config, flags) => {
                fx.writeConfig(config);
                const run = await spawnNode([MERGE_CLI, '--detect', '--merge', '--write', ...flags, '--config', fx.abs('docs/project-config.json')], { cwd: fx.project, env: { CLAUDE_PROJECT_DIR: fx.project } });
                assert.equal(run.code, 0, run.stderr);
                return JSON.parse(fs.readFileSync(fx.abs('docs/project-config.json'), 'utf8')).conventionInjection;
            };
            // Explicitly switched off → stays off even when setup asks to enable
            assert.deepEqual(await runSetup(cliConfig({ conventionInjection: { enabled: false, maxChars: 3000 } }), ['--enable']), { enabled: false, maxChars: 3000 });
            // Without an explicit setup request to enable → never switched on
            assert.equal(await runSetup(cliConfig({}), []), undefined);
            // Counter-case: explicit setup request and no maintainer choice → switched on, other settings kept
            assert.deepEqual(await runSetup(cliConfig({ conventionInjection: { maxChars: 3000 } }), ['--enable']), { maxChars: 3000, enabled: true });
            // Edge: an enable-only run on an already merged configuration still switches delivery on
            const configFile = fx.abs('docs/project-config.json');
            const setupRun = flags => spawnNode([MERGE_CLI, '--detect', '--merge', '--write', ...flags, '--config', configFile], { cwd: fx.project, env: { CLAUDE_PROJECT_DIR: fx.project } });
            const merged = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            fx.writeConfig({ ...merged, conventionInjection: { maxChars: 3000 } });
            const enableOnly = JSON.parse((await setupRun(['--enable'])).stdout);
            assert.deepEqual([enableOnly.added, enableOnly.refreshed, enableOnly.written], [[], [], true], JSON.stringify(enableOnly));
            // And the rewritten configuration is complete and parseable, with no temporary file left beside it
            const rewritten = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            assert.deepEqual([rewritten.conventionInjection, rewritten.contextGroups], [{ maxChars: 3000, enabled: true }, merged.contextGroups]);
            assert.deepEqual(fs.readdirSync(path.dirname(configFile)).filter(name => name.endsWith('.tmp')), []);
            // Edge: maintainer switched delivery off → the enable request is reported as skipped and the file is untouched
            fx.writeConfig({ ...merged, conventionInjection: { enabled: false } });
            const offText = fs.readFileSync(configFile, 'utf8');
            const skipped = JSON.parse((await setupRun(['--enable'])).stdout);
            assert.deepEqual([skipped.written, skipped.enableSkipped], [false, 'explicitly disabled by maintainer']);
            assert.equal(fs.readFileSync(configFile, 'utf8'), offText);
        })
    },

    // TC-PFCI-023: Setup refreshes an unedited detected class
    {
        name: 'TC-PFCI-023 merge refreshes unedited detected group',
        fn: async () => withFixture(async fx => {
            // Given an unedited detected "integration-test" covering one test project
            const before = { name: 'integration-test', pathRegexes: [], pathGlobs: ['tests/A/**'], skills: ['integration-test'] };
            const stamped = { ...before, origin: 'detected', detectedFingerprint: merge.fingerprintGroup(before) };
            // When newer detection covering two test projects is merged
            const after = { ...before, pathGlobs: ['tests/A/**', 'tests/B/**'] };
            const result = merge.mergeDetected([stamped], [after]);
            // Then the class covers both and carries a new fingerprint
            assert.deepEqual(result.refreshed, ['integration-test']);
            assert.deepEqual(result.groups[0].pathGlobs, ['tests/A/**', 'tests/B/**']);
            assert.equal(result.groups[0].detectedFingerprint, merge.fingerprintGroup(after));
            assert.notEqual(result.groups[0].detectedFingerprint, stamped.detectedFingerprint);
            // Edge: identical detection → reported kept; the CLI writes nothing
            assert.deepEqual(merge.mergeDetected(result.groups, [after]).kept, ['integration-test']);
            fx.write('docs/project-reference/integration-test-reference.md', '# ref');
            fx.write('.claude/skills/integration-test/SKILL.md', '# skill');
            fx.writeConfig({ testing: { filePatterns: { integration: '*.test.cjs' } }, framework: { integrationTestDoc: 'docs/project-reference/integration-test-reference.md' } });
            const args = [MERGE_CLI, '--detect', '--merge', '--write', '--config', fx.abs('docs/project-config.json')];
            const opts = { cwd: fx.project, env: { CLAUDE_PROJECT_DIR: fx.project } };
            assert.equal(JSON.parse((await spawnNode(args, opts)).stdout).written, true);
            const written = fs.readFileSync(fx.abs('docs/project-config.json'), 'utf8');
            const second = JSON.parse((await spawnNode(args, opts)).stdout);
            assert.equal(second.written, false);
            assert.deepEqual(second.kept, ['integration-test']);
            assert.equal(fs.readFileSync(fx.abs('docs/project-config.json'), 'utf8'), written);
        })
    },

    // TC-PFCI-031: No duplicate reminder within one conversation
    {
        name: 'TC-PFCI-031 dedup same scope',
        fn: async () => withFixture(async fx => {
            const lib = { name: 'lib-context', pathRegexes: [], pathGlobs: ['.claude/hooks/lib/**'], rules: ['Libraries stay pure'] };
            const config = enabled([hooksGroup(), lib]);
            // Given "hooks-context" was delivered a moment ago
            assert.ok((await deliver(fx, config, post(fx, 'Read', '.claude/hooks/a.cjs'))).includes('hooks-context'));
            // When another hook source file is changed / Then nothing is shown
            assert.equal(await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/b.cjs', { tool_input: { file_path: fx.abs('.claude/hooks/b.cjs') } }), { now: NOW + 1000 }), '');
            // Edge: a file also matching a new class → only the new class is delivered
            const context = await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/lib/c.cjs'), { now: NOW + 2000 });
            assert.ok(context.includes(tagOf(lib)) && !context.includes('[[convention:hooks-context@'), context);
        })
    },

    // TC-PFCI-032: A condensation reported by the host re-arms delivery
    {
        name: 'TC-PFCI-032 SessionStart compact re-arms',
        fn: async () => withFixture(async fx => {
            const config = enabled([hooksGroup()]);
            for (const source of ['compact', 'clear']) {
                const session = `session-${source}`;
                const main = post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: session });
                const helper = { ...main, agent_id: 'helper-1' };
                // Given delivery in the main conversation and in a helper agent
                assert.ok(await deliver(fx, config, main));
                assert.ok(await deliver(fx, config, helper));
                assert.equal(await deliver(fx, config, main, { now: NOW + 500 }), '');
                // When the host reports the session was condensed (or cleared)
                assert.equal(await sessionStart(fx, source, session, NOW + 1000), '');
                // Then both contexts are shown the reminder again on their next change
                assert.ok((await deliver(fx, config, main, { now: NOW + 2000 })).includes('hooks-context'), source);
                assert.ok((await deliver(fx, config, helper, { now: NOW + 2000 })).includes('hooks-context'), `${source} helper`);
            }
            // Edge: a condensation reported for another session → no effect
            const other = post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: 'session-other' });
            assert.ok(await deliver(fx, config, other));
            await sessionStart(fx, 'compact', 'session-unrelated', NOW + 1000);
            assert.equal(await deliver(fx, config, other, { now: NOW + 2000 }), '');
            // Edge: a helper whose own history is measurable relies on its own condensation marks —
            // the session-wide report (which does not say which context condensed) re-arms main only
            const mainHistory = path.join(fx.transcripts, 'measured-main.jsonl');
            fs.writeFileSync(mainHistory, 'x\n');
            const helperHistory = path.join(fx.transcripts, 'session-measured', 'subagents', 'agent-helper-m.jsonl');
            fs.mkdirSync(path.dirname(helperHistory), { recursive: true });
            fs.writeFileSync(helperHistory, 'x\n');
            const measuredMain = post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: 'session-measured', transcript_path: mainHistory });
            const measuredHelper = { ...measuredMain, agent_id: 'helper-m' };
            assert.ok(await deliver(fx, config, measuredMain));
            assert.ok(await deliver(fx, config, measuredHelper));
            await sessionStart(fx, 'compact', 'session-measured', NOW + 1000);
            assert.ok((await deliver(fx, config, measuredMain, { now: NOW + 2000 })).includes('hooks-context'), 'main re-armed by the report');
            assert.equal(await deliver(fx, config, measuredHelper, { now: NOW + 2000 }), '', 'measured helper not re-armed by the report');
            fs.appendFileSync(helperHistory, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(NOW + 3000).toISOString() })}\n`);
            assert.ok((await deliver(fx, config, measuredHelper, { now: NOW + 4000 })).includes('hooks-context'), 'own condensation mark re-arms the helper');
            // Edge: an identified helper whose history path cannot be derived (unsafe session id) falls back to the report
            const unmeasured = { ...measuredHelper, session_id: '..', agent_id: 'helper-u' };
            assert.equal(ledger.transcriptPathFor(unmeasured), null);
            assert.ok(await deliver(fx, config, unmeasured));
            await sessionStart(fx, 'compact', '..', NOW + 5000);
            assert.ok((await deliver(fx, config, unmeasured, { now: NOW + 6000 })).includes('hooks-context'), 'unmeasured helper re-armed by the report');
            // End-to-end with real processes and clock
            fx.writeConfig(config);
            const input = post(fx, 'Read', '.claude/hooks/a.cjs', { session_id: 'session-e2e' });
            assert.ok(contextOf((await spawnHook(fx, input)).stdout));
            assertSilent(await spawnHook(fx, input), 'present');
            assertSilent(await spawnHook(fx, { hook_event_name: 'SessionStart', source: 'compact', session_id: 'session-e2e' }), 'compact report');
            assert.ok(contextOf((await spawnHook(fx, input)).stdout).includes('hooks-context'));
        })
    },

    // TC-PFCI-033: A condensation found in the conversation history re-arms delivery
    {
        name: 'TC-PFCI-033 transcript boundary re-arms',
        fn: async () => withFixture(async fx => {
            const config = enabled([hooksGroup()], { compactionMarkers: ['"custom_condense"'] });
            const transcript = path.join(fx.transcripts, 'main.jsonl');
            // Given an old condensation mark BEFORE the delivery (must not re-arm)
            fs.writeFileSync(transcript, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(NOW - MINUTE).toISOString() })}\n`);
            const input = post(fx, 'Edit', '.claude/hooks/a.cjs', { transcript_path: transcript });
            assert.ok(await deliver(fx, config, input));
            assert.equal(await deliver(fx, config, input, { now: NOW + 1000 }), '');
            // When a condensation mark appears later in the history
            fs.appendFileSync(transcript, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(NOW + 5000).toISOString() })}\n`);
            // Then the next change shows the reminder again
            assert.ok((await deliver(fx, config, input, { now: NOW + 6000 })).includes('hooks-context'));
            assert.equal(await deliver(fx, config, input, { now: NOW + 7000 }), '');
            // And a custom condensation marker works the same
            fs.appendFileSync(transcript, `${JSON.stringify({ type: 'custom_condense', timestamp: new Date(NOW + 8000).toISOString() })}\n`);
            assert.ok((await deliver(fx, config, input, { now: NOW + 9000 })).includes('hooks-context'));
            // And more history than can be inspected since the last check → condensation assumed
            const settings = conventions.resolveSettings(config);
            fs.appendFileSync(transcript, `${'y'.repeat(300)}\n`);
            // (inferred times are stamped one millisecond before the check, so a delivery made in the
            // same millisecond counts as after the condensation instead of re-delivering forever)
            assert.equal(ledger.lastCompactionAt(fx.store, 'session-1', 'main', input, settings, NOW + 20000, { scanCapBytes: 100 }), NOW + 20000 - 1);
            // Edge (tie): overflow inferred at `now`, delivery at that same `now` ⇒ present on the next call
            fs.appendFileSync(transcript, `${'w'.repeat(300)}\n`);
            const tieRecord = { hash: hashOf(hooksGroup()), deliveredAt: NOW + 30000, transcriptBytes: fs.statSync(transcript).size, form: 'full' };
            const tieBoundary = ledger.lastCompactionAt(fx.store, 'session-1', 'main', input, settings, NOW + 30000, { scanCapBytes: 100 });
            assert.ok(tieBoundary < tieRecord.deliveredAt, 'inferred boundary precedes a same-millisecond delivery');
            assert.equal(ledger.isPresent(tieRecord, tieRecord.hash, { lastCompactionAt: tieBoundary, transcriptSize: tieRecord.transcriptBytes, now: NOW + 30000 }, settings), true);
            // Edge: unchanged history leaves the scan state untouched (no rewrite)
            // (a marker field only this test writes proves the file itself was left alone, which comparing
            // timestamps cannot: two writes in the same millisecond are indistinguishable)
            const scanPath = path.join(fx.store, 'session-1', 'main', '_scan.json');
            const stored = JSON.parse(fs.readFileSync(scanPath, 'utf8'));
            fs.writeFileSync(scanPath, JSON.stringify({ ...stored, untouchedMarker: 'kept' }));
            ledger.lastCompactionAt(fx.store, 'session-1', 'main', input, settings, NOW + 40000);
            const after = JSON.parse(fs.readFileSync(scanPath, 'utf8'));
            assert.equal(after.untouchedMarker, 'kept', 'unchanged history does not rewrite the scan state');
            assert.deepEqual([after.offset, after.lastBoundaryAt], [stored.offset, stored.lastBoundaryAt]);
            // Counter-case: history grew → the scan state is written again (the marker is replaced)
            fs.appendFileSync(transcript, 'more\n');
            ledger.lastCompactionAt(fx.store, 'session-1', 'main', input, settings, NOW + 41000);
            assert.equal(JSON.parse(fs.readFileSync(scanPath, 'utf8')).untouchedMarker, undefined);
            // Edge: history rewritten shorter → rescanned from the start
            const rewritten = path.join(fx.transcripts, 'rewritten.jsonl');
            fs.writeFileSync(rewritten, `${'z'.repeat(2000)}\n`);
            assert.equal(ledger.scanCompaction(fx.store, 'session-r', 'main', rewritten, settings, NOW), null);
            fs.writeFileSync(rewritten, `${JSON.stringify({ subtype: 'compact_boundary', timestamp: new Date(NOW + 1).toISOString() })}\n`);
            assert.equal(ledger.scanCompaction(fx.store, 'session-r', 'main', rewritten, settings, NOW + 2), NOW + 1);
            // Edge (host without a SessionStart mirror, i.e. Codex): the whole deliver → condense →
            // re-deliver lifecycle runs on tool events alone. No SessionStart event is sent anywhere in
            // this test, so the transcript marks are the only condensation signal and the retention
            // sweep can only have come from the delivering path.
            const noStart = path.join(fx.transcripts, 'no-session-start.jsonl');
            fs.writeFileSync(noStart, 'start\n');
            const noStartInput = post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: 'no-start-1', transcript_path: noStart });
            assert.ok((await deliver(fx, config, noStartInput, { now: NOW })).includes('hooks-context'), 'delivers with no SessionStart event');
            assert.equal(await deliver(fx, config, noStartInput, { now: NOW + 1000 }), '', 'and stays suppressed while present');
            fs.appendFileSync(noStart, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(NOW + 2000).toISOString() })}\n`);
            assert.ok((await deliver(fx, config, noStartInput, { now: NOW + 3000 })).includes('hooks-context'), 'a transcript-only condensation re-arms without any SessionStart');
            assert.ok(fs.existsSync(path.join(fx.store, '_prune.json')), 'retention sweeps on the delivering path, not only on SessionStart');
        })
    },

    // TC-PFCI-034: Changed class content is delivered again
    {
        name: 'TC-PFCI-034 hash change re-injects',
        fn: async () => withFixture(async fx => {
            // Given "hooks-context" was delivered at version A
            const versionA = hooksGroup();
            assert.ok(await deliver(fx, enabled([versionA]), post(fx, 'Edit', '.claude/hooks/a.cjs')));
            // When a maintainer adds a rule and a hook source changes
            const versionB = hooksGroup({ rules: ['Hooks use CommonJS', 'Never call process.exit in a PreToolUse hook'] });
            const context = await deliver(fx, enabled([versionB]), post(fx, 'Edit', '.claude/hooks/a.cjs'), { now: NOW + 1000 });
            // Then a reminder with a new version tag including the new rule is shown, once
            assert.notEqual(tagOf(versionA), tagOf(versionB));
            assert.ok(context.includes(tagOf(versionB)) && context.includes('- Never call process.exit in a PreToolUse hook'), context);
            assert.equal(ledger.readRecord(fx.store, 'session-1', 'main', 'hooks-context').hash, hashOf(versionB));
            assert.equal(await deliver(fx, enabled([versionB]), post(fx, 'Edit', '.claude/hooks/a.cjs'), { now: NOW + 2000 }), '');
            // Edge: reordering unrelated classes leaves the version unchanged → no re-delivery
            const reordered = enabled([{ name: 'other', pathRegexes: ['/nothing/'], rules: ['x'] }, versionB]);
            assert.equal(await deliver(fx, reordered, post(fx, 'Edit', '.claude/hooks/a.cjs'), { now: NOW + 3000 }), '');
            // Edge: the version also covers which files belong to the class (static rows show those patterns)
            const base = hooksGroup();
            for (const [label, changed] of [
                ['include pattern', hooksGroup({ pathGlobs: ['tools/**'] })],
                ['file-name pattern', hooksGroup({ fileNameRegexes: ['^index'] })],
                ['exclusion', hooksGroup({ excludePathGlobs: ['.claude/hooks/tests/**'] })],
                ['exclusion pattern', hooksGroup({ excludePathRegexes: ['/tests/'] })],
                ['file-type filter', hooksGroup({ fileExtensions: ['.cjs', '.mjs'] })],
                ['location pattern', hooksGroup({ pathRegexes: ['[\\\\/]hooks[\\\\/]'] })]
            ]) {
                assert.notEqual(tagOf(changed), tagOf(base), `${label} changes the version`);
            }
            // Edge: equivalent spellings keep the version (absent list ≡ empty list; file types normalized)
            assert.equal(tagOf(hooksGroup({ excludePathGlobs: [] })), tagOf(base));
            assert.equal(tagOf(hooksGroup({ fileExtensions: ['CJS'] })), tagOf(base));
        })
    },

    // TC-PFCI-035: A helper agent receives its own reminder
    {
        name: 'TC-PFCI-035 subagent scope separate',
        fn: async () => withFixture(async fx => {
            const config = enabled([hooksGroup()]);
            const main = post(fx, 'Edit', '.claude/hooks/a.cjs');
            const helper = { ...main, agent_id: 'agent-123' };
            // Scenario: main delivery does not suppress the helper
            assert.ok(await deliver(fx, config, main));
            assert.ok((await deliver(fx, config, helper)).includes('hooks-context'));
            assert.equal(await deliver(fx, config, helper, { now: NOW + 1 }), '');
            // And a helper-only delivery does not suppress main in a fresh session
            assert.ok(await deliver(fx, config, { ...helper, session_id: 'session-2' }));
            assert.ok((await deliver(fx, config, { ...main, session_id: 'session-2' })).includes('hooks-context'));
            // Scenario: host gives no helper identity → shares main → suppressed
            assert.equal(await deliver(fx, config, { ...main, agent_id: '' }, { now: NOW + 2 }), '');
            // Edge: identifier with path separators is safely normalized inside the store
            const odd = { ...main, session_id: 'session-3', agent_id: '../../escape\\id' };
            assert.ok(await deliver(fx, config, odd));
            const scope = ledger.scopeFor(odd);
            assert.ok(!/[\\/]/.test(scope));
            assert.ok(fs.existsSync(path.join(fx.store, 'session-3', scope, 'hooks-context.json')));
        })
    },

    // TC-PFCI-036: Faded reminders are delivered again after the conversation grows
    {
        name: 'TC-PFCI-036 byte distance re-arms',
        fn: async () => withFixture(async fx => {
            const LIMIT = 50000;
            const settings = conventions.resolveSettings(enabled([], { reinjectAfterBytes: LIMIT }));
            // Property: present iff 0 <= growth < limit, for all growth values including both boundaries;
            // a history shorter than at delivery (negative growth) was replaced → absent
            const record = { hash: 'h', deliveredAt: NOW, transcriptBytes: 1000, form: 'full' };
            for (const growth of [-1000, -1, 0, 1, LIMIT - 1, LIMIT, LIMIT + 1, 10 * LIMIT]) {
                const ctx = { lastCompactionAt: -Infinity, transcriptSize: 1000 + growth, now: NOW };
                assert.equal(ledger.isPresent(record, 'h', ctx, settings), growth >= 0 && growth < LIMIT, `growth ${growth}`);
            }
            // And the default limit is about ninety thousand tokens of history (bytes, not tokens)
            assert.equal(conventions.resolveSettings(enabled([])).reinjectAfterBytes, 2000000);
            // Scenario (end-to-end): given delivery at 1000 bytes of history
            const config = enabled([hooksGroup()], { reinjectAfterBytes: LIMIT });
            const transcript = path.join(fx.transcripts, 'main.jsonl');
            fs.writeFileSync(transcript, 'x'.repeat(1000));
            const input = post(fx, 'Edit', '.claude/hooks/a.cjs', { transcript_path: transcript });
            assert.ok(await deliver(fx, config, input));
            // When history grows by one byte less than the limit / Then nothing
            appendBytes(transcript, LIMIT - 1);
            assert.equal(await deliver(fx, config, input, { now: NOW + 1 }), '');
            // When growth reaches exactly the limit / Then the reminder is shown again and the record refreshed
            appendBytes(transcript, 1);
            assert.ok((await deliver(fx, config, input, { now: NOW + 2 })).includes('hooks-context'));
            assert.equal(ledger.readRecord(fx.store, 'session-1', 'main', 'hooks-context').transcriptBytes, 1000 + LIMIT);
            assert.equal(await deliver(fx, config, input, { now: NOW + 3 }), '');
            // Scenario (end-to-end): the history is replaced by a shorter one → the reminder is shown again
            fs.writeFileSync(transcript, 'x'.repeat(10));
            assert.ok((await deliver(fx, config, input, { now: NOW + 4 })).includes('hooks-context'));
            assert.equal(ledger.readRecord(fx.store, 'session-1', 'main', 'hooks-context').transcriptBytes, 10);
        })
    },

    // TC-PFCI-037: Time re-arms delivery when history size is unknown but condensation is still observed
    {
        name: 'TC-PFCI-037 age re-arm without transcript',
        fn: async () => withFixture(async fx => {
            const config = enabled([hooksGroup()], { reinjectAfterMinutes: 30, blindReinjectAfterMinutes: 5 });
            const input = post(fx, 'Edit', '.claude/hooks/a.cjs');
            // Given the host reported a condensation (so this context's condensations ARE observed)
            // and no history size is available, and a delivery at NOW
            await sessionStart(fx, 'compact', 'session-1', NOW - MINUTE);
            assert.ok(await deliver(fx, config, input));
            // Scenario: 29 minutes later → nothing (the normal window applies, NOT the blind one)
            assert.equal(await deliver(fx, config, input, { now: NOW + 29 * MINUTE }), '');
            // Scenario: exactly 30 minutes later → shown again
            assert.ok((await deliver(fx, config, input, { now: NOW + 30 * MINUTE })).includes('hooks-context'));
            // Boundary on the decision itself: limit - 1 ms present, limit absent, beyond absent
            const settings = conventions.resolveSettings(config);
            const record = { hash: 'h', deliveredAt: NOW, transcriptBytes: null, form: 'full' };
            const at = delta => ledger.isPresent(record, 'h', { lastCompactionAt: NOW - MINUTE, transcriptSize: null, now: NOW + delta }, settings);
            assert.deepEqual([at(30 * MINUTE - 1), at(30 * MINUTE), at(31 * MINUTE)], [true, false, false]);
            // Counter-case: a measurable history is judged by growth, not by either time limit —
            // hours old but only one byte of growth stays present, so measurable hosts are not made noisier
            const big = { hash: 'h', deliveredAt: NOW, transcriptBytes: 1000, form: 'full' };
            assert.equal(ledger.isPresent(big, 'h', { lastCompactionAt: NOW - MINUTE, transcriptSize: 1001, now: NOW + 600 * MINUTE }, settings), true);
        })
    },

    // TC-PFCI-038: Current static instructions count as an early delivery
    {
        name: 'TC-PFCI-038 static credit main scope',
        fn: async () => withFixture(async fx => {
            // Given the static instructions carry the current tag and the main conversation is short and uncondensed
            const group = hooksGroup();
            const config = enabled([group]);
            fx.write('CLAUDE.md', `| hooks | ${tagOf(group)} |`);
            const transcript = path.join(fx.transcripts, 'main.jsonl');
            fs.writeFileSync(transcript, 'x'.repeat(100));
            const input = post(fx, 'Edit', '.claude/hooks/a.cjs', { transcript_path: transcript });
            // When a hook source changes / Then nothing is shown and no record is written
            assert.equal(await deliver(fx, config, input), '');
            assert.equal(ledger.readRecord(fx.store, 'session-1', 'main', 'hooks-context'), null);
            // And after the conversation is condensed, the next change shows the reminder
            await sessionStart(fx, 'compact', 'session-1', NOW + 1000);
            assert.ok((await deliver(fx, config, input, { now: NOW + 2000 })).includes('hooks-context'));
            // And the credit also ends once distance from session start reaches the limit
            const settings = conventions.resolveSettings(config);
            const credit = ledger.staticCredit('main', tagOf(group), hashOf(group), { transcriptSize: 1 }, fx.project);
            const ctxAt = size => ({ lastCompactionAt: -Infinity, transcriptSize: size, now: NOW });
            assert.equal(ledger.isPresent(credit, hashOf(group), ctxAt(settings.reinjectAfterBytes - 1), settings), true);
            assert.equal(ledger.isPresent(credit, hashOf(group), ctxAt(settings.reinjectAfterBytes), settings), false);
            // Edge: the history already holds a condensation mark before the first trigger → no credit, reminder shown
            const condensed = path.join(fx.transcripts, 'condensed.jsonl');
            fs.writeFileSync(condensed, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(NOW - MINUTE).toISOString() })}\n`);
            const condensedInput = post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: 'session-condensed', transcript_path: condensed });
            assert.ok((await deliver(fx, config, condensedInput)).includes('hooks-context'));
            assert.ok(ledger.readRecord(fx.store, 'session-condensed', 'main', 'hooks-context'), 'delivery recorded');
            // Edge: a first look at a history already at the distance limit starts at its end (earlier marks are moot)
            const bigSettings = conventions.resolveSettings(enabled([], { reinjectAfterBytes: 50000 }));
            const big = path.join(fx.transcripts, 'big.jsonl');
            fs.writeFileSync(big, `${JSON.stringify({ subtype: 'compact_boundary', timestamp: new Date(NOW - MINUTE).toISOString() })}\n${'p'.repeat(50000)}\n`);
            assert.equal(ledger.scanCompaction(fx.store, 'session-big', 'main', big, bigSettings, NOW), null);
            assert.equal(JSON.parse(fs.readFileSync(path.join(fx.store, 'session-big', 'main', '_scan.json'), 'utf8')).offset, fs.statSync(big).size);
            // Counter-case: a short history on first look → scanned from the start, the mark is found
            fs.writeFileSync(big, `${JSON.stringify({ subtype: 'compact_boundary', timestamp: new Date(NOW - MINUTE).toISOString() })}\n`);
            assert.equal(ledger.scanCompaction(fx.store, 'session-small', 'main', big, bigSettings, NOW), NOW - MINUTE);
        })
    },

    // TC-PFCI-039: Stale static instructions and helper agents get no early credit
    {
        name: 'TC-PFCI-039 no credit for stale tag or subagent',
        fn: async () => withFixture(async fx => {
            const group = hooksGroup();
            const config = enabled([group]);
            const transcript = path.join(fx.transcripts, 'main.jsonl');
            fs.writeFileSync(transcript, 'x'.repeat(100));
            // Scenario: stale tag in the main conversation → reminder shown
            fx.write('CLAUDE.md', '| hooks | [[convention:hooks-context@old00000]] |');
            assert.ok(await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/a.cjs', { transcript_path: transcript })));
            assert.equal(ledger.readRecord(fx.store, 'session-1', 'main', 'hooks-context').hash, hashOf(group), 'stale tag: record written');
            // Scenario: one static carrier stale, the other current (either order) → still no credit (every carrier must be current)
            const staleTag = '[[convention:hooks-context@old00000]]';
            for (const [label, claude, agents] of [['CLAUDE.md stale', staleTag, tagOf(group)], ['AGENTS.md stale', tagOf(group), staleTag]]) {
                ledger._resetCarrierCache();
                fx.write('CLAUDE.md', `| hooks | ${claude} |`);
                fx.write('AGENTS.md', agents);
                const session = `session-mixed-${label.slice(0, 6)}`;
                assert.equal(ledger.staticCredit('main', tagOf(group), hashOf(group), { transcriptSize: 1 }, fx.project), null, label);
                assert.ok((await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: session, transcript_path: transcript }))).includes('hooks-context'), label);
                assert.ok(ledger.readRecord(fx.store, session, 'main', 'hooks-context'), `${label}: record written`);
            }
            // Counter-case: both carriers current → credit
            ledger._resetCarrierCache();
            fx.write('CLAUDE.md', `| hooks | ${tagOf(group)} |`);
            fx.write('AGENTS.md', tagOf(group));
            assert.ok(ledger.staticCredit('main', tagOf(group), hashOf(group), { transcriptSize: 1 }, fx.project));
            // Scenario: current tag, helper agent → reminder shown
            ledger._resetCarrierCache();
            const helperTranscriptDir = path.join(fx.transcripts, 'session-2', 'subagents');
            fs.mkdirSync(helperTranscriptDir, { recursive: true });
            fs.writeFileSync(path.join(helperTranscriptDir, 'agent-helper.jsonl'), 'x');
            assert.ok(await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: 'session-2', agent_id: 'helper', transcript_path: transcript })));
            // Edge: no static instructions file → no credit
            ledger._resetCarrierCache();
            fs.rmSync(fx.abs('CLAUDE.md'));
            fs.rmSync(fx.abs('AGENTS.md'));
            assert.equal(ledger.staticCredit('main', tagOf(group), hashOf(group), { transcriptSize: 1 }, fx.project), null);
        })
    },

    // TC-PFCI-040: A context that can only be guessed at re-arms on the short blind limit
    {
        name: 'TC-PFCI-040 blind window without transcript or condensation report',
        fn: async () => withFixture(async fx => {
            const config = enabled([hooksGroup()]);
            const settings = conventions.resolveSettings(config);
            // The knob's own default is five minutes, and it is a separate knob from the measured one
            assert.equal(settings.blindReinjectAfterMinutes, 5);
            assert.equal(conventions.DEFAULTS.blindReinjectAfterMinutes, 5);
            assert.notEqual(settings.blindReinjectAfterMinutes, settings.reinjectAfterMinutes);
            // Given no history AND no condensation ever reported for this context (the blind state)
            const input = post(fx, 'Edit', '.claude/hooks/a.cjs');
            assert.ok(await deliver(fx, config, input));
            // Scenario: four minutes later → nothing (still counted as present)
            assert.equal(await deliver(fx, config, input, { now: NOW + 4 * MINUTE }), '');
            // Scenario: five minutes later → shown again, long before the 30-minute measured limit
            assert.ok((await deliver(fx, config, input, { now: NOW + 5 * MINUTE })).includes('hooks-context'));
            // Boundary on the decision itself: blind limit - 1 ms present, blind limit absent
            const record = { hash: 'h', deliveredAt: NOW, transcriptBytes: null, form: 'full' };
            const blindAt = delta => ledger.isPresent(record, 'h', { lastCompactionAt: -Infinity, transcriptSize: null, now: NOW + delta }, settings);
            assert.deepEqual([blindAt(5 * MINUTE - 1), blindAt(5 * MINUTE), blindAt(29 * MINUTE)], [true, false, false]);
            // Counter-case (same instant, same record): once a condensation HAS been observed for the
            // context, the measured window governs — 29 minutes is still present
            const seenAt = delta => ledger.isPresent(record, 'h', { lastCompactionAt: NOW - 1, transcriptSize: null, now: NOW + delta }, settings);
            assert.deepEqual([seenAt(5 * MINUTE), seenAt(29 * MINUTE), seenAt(30 * MINUTE)], [true, true, false]);
            // Counter-case: a measurable history never reaches the blind branch at all
            assert.equal(ledger.isPresent({ ...record, transcriptBytes: 0 }, 'h',
                { lastCompactionAt: -Infinity, transcriptSize: 1, now: NOW + 600 * MINUTE }, settings), true);
            // And the window is configurable: a one-minute blind limit re-arms after one minute
            const tight = enabled([hooksGroup()], { blindReinjectAfterMinutes: 1 });
            const tightInput = post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: 'session-tight' });
            assert.ok(await deliver(fx, tight, tightInput));
            assert.equal(await deliver(fx, tight, tightInput, { now: NOW + MINUTE - 1 }), '');
            assert.ok((await deliver(fx, tight, tightInput, { now: NOW + MINUTE })).includes('hooks-context'));
            // And it governs ONLY the blind path: the same tight setting leaves a reported-condensation
            // context on its own 30-minute limit
            await sessionStart(fx, 'compact', 'session-seen', NOW - MINUTE);
            const seenInput = post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: 'session-seen' });
            assert.ok(await deliver(fx, tight, seenInput));
            assert.equal(await deliver(fx, tight, seenInput, { now: NOW + 29 * MINUTE }), '');
            assert.ok((await deliver(fx, tight, seenInput, { now: NOW + 30 * MINUTE })).includes('hooks-context'));
        })
    },

    // TC-PFCI-041: Recording a condensation shows nothing
    {
        name: 'TC-PFCI-041 SessionStart silent',
        fn: async () => withFixture(async fx => {
            fx.writeConfig(enabled([hooksGroup()]));
            // Given delivery is on / When the host reports a condensation or a clear / Then nothing is shown
            for (const source of ['compact', 'clear']) {
                const session = `s-${source}`;
                assertSilent(await spawnHook(fx, { hook_event_name: 'SessionStart', source, session_id: session }), source);
                assert.equal(typeof ledger.readSessionCompaction(fx.store, session), 'number', `${source} recorded`);
            }
            // Edge: startup or resume → nothing recorded, nothing shown
            for (const source of ['startup', 'resume']) {
                assertSilent(await spawnHook(fx, { hook_event_name: 'SessionStart', source, session_id: `s-${source}` }), source);
                assert.equal(ledger.readSessionCompaction(fx.store, `s-${source}`), null);
            }
        })
    },

    // TC-PFCI-051: Nothing is delivered unless explicitly switched on
    {
        name: 'TC-PFCI-051 no-op when disabled or unconfigured',
        fn: async () => withFixture(async fx => {
            fx.write('.claude/hooks/a.cjs');
            const input = post(fx, 'Edit', '.claude/hooks/a.cjs');
            const condensation = source => ({ hook_event_name: 'SessionStart', source, session_id: `off-${source}`, cwd: fx.project });
            // The invariant is "no delivery memory, for ALL such triggers", so the switch is
            // exercised on every event the hook is registered for — not only the delivering one.
            // A condensation report reaches the memory on its own path (it records the report and
            // runs the retention sweep), so a switch honoured only on the tool path would still
            // write into, and delete from, the memory of a project that never opted in.
            const everyEvent = [
                ['PostToolUse Edit', input],
                ['SessionStart compact', condensation('compact')],
                ['SessionStart clear', condensation('clear')]
            ];
            const silent = [
                ['switch absent', { contextGroups: [hooksGroup()] }],
                ['switch off', { conventionInjection: { enabled: false }, contextGroups: [hooksGroup()] }],
                ['non-yes value', { conventionInjection: { enabled: 'yes' }, contextGroups: [hooksGroup()] }],
                ['no deliverable class', enabled([{ name: 'styles', pathRegexes: [HOOKS_REGEX], stylingDoc: 'docs/s.md' }])],
                ['no configuration', null]
            ];
            for (const [label, config] of silent) {
                // Given the condition / When each trigger fires / Then silent and no delivery memory
                if (config) fx.writeConfig(config);
                else fs.rmSync(fx.abs('docs/project-config.json'), { force: true });
                for (const [trigger, payload] of everyEvent) {
                    assertSilent(await spawnHook(fx, payload), `${label} / ${trigger}`);
                    assert.ok(storeIsEmpty(fx), `${label} / ${trigger}: no delivery memory`);
                    if (payload.source) assert.equal(ledger.readSessionCompaction(fx.store, payload.session_id), null, `${label} / ${trigger}: no condensation recorded`);
                }
            }
            // And every remaining tool trigger is inert under the same condition. The list is
            // checked against the hook's own trigger set, so a newly added tool cannot silently
            // escape this test.
            const toolTriggers = ['Read', 'Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'apply_patch'];
            assert.deepEqual([...hook.TRIGGER_TOOLS].sort(), [...toolTriggers].sort(), 'every trigger tool is covered here');
            fx.writeConfig({ contextGroups: [hooksGroup()] });
            for (const tool of toolTriggers.filter(name => name !== 'Edit')) {
                const payload = tool === 'apply_patch'
                    ? patch(fx, [`*** Update File: ${fx.abs('.claude/hooks/a.cjs')}`, '+// changed'])
                    : post(fx, tool, '.claude/hooks/a.cjs');
                assertSilent(await spawnHook(fx, payload), `switch absent / ${tool}`);
                assert.ok(storeIsEmpty(fx), `switch absent / ${tool}: no delivery memory`);
            }
            // And the retention sweep obeys the same switch: delivery memory old enough to be
            // swept survives every trigger while the switch is off (BR-PFCI-01 before BR-PFCI-18).
            const offStore = path.join(fx.root, 'off-store');
            plant(offStore, 'ancient/main/hooks-context.json');
            ledger.markSessionOwned(offStore, 'ancient');
            backdate(path.join(offStore, 'ancient'), 8 * DAY);
            for (const [trigger, payload] of everyEvent) {
                assertSilent(await spawnHook(fx, payload, { env: { CK_CONVENTIONS_DIR: offStore } }), `sweep off / ${trigger}`);
                assert.ok(fs.existsSync(path.join(offStore, 'ancient')), `${trigger}: no retention sweep while the switch is off`);
            }
            // Edge: with diagnostics requested, the reason is explained on the diagnostic stream only
            fx.writeConfig({ contextGroups: [hooksGroup()] });
            const explained = await spawnHook(fx, input, { env: { CK_DEBUG: '1' } });
            assert.deepEqual([explained.code, explained.stdout], [0, '']);
            assert.ok(explained.stderr.includes('[file-convention-inject] skip: disabled'), explained.stderr);
            assert.ok(storeIsEmpty(fx));
            // Boundary counter-case: switch on with one deliverable class → reminder shown
            fx.writeConfig(enabled([hooksGroup()]));
            assert.ok(contextOf((await spawnHook(fx, input)).stdout).includes('hooks-context'));
            assert.ok(fs.existsSync(path.join(fx.store, '_prune.json')), 'the delivering path runs the retention sweep');
            // …and the condensation path resumes in full once the switch is on: the report is
            // recorded and its sweep reclaims the stale memory the switched-off runs left alone
            assertSilent(await spawnHook(fx, condensation('compact'), { env: { CK_CONVENTIONS_DIR: offStore } }), 'switch on / SessionStart');
            assert.equal(typeof ledger.readSessionCompaction(offStore, 'off-compact'), 'number', 'a reported condensation is recorded again');
            assert.ok(!fs.existsSync(path.join(offStore, 'ancient')), 'and its retention sweep runs again');
            // And diagnostics never alter the reminder: same output shape, the delivery is explained
            const traced = await spawnHook(fx, { ...input, session_id: 'session-traced' }, { env: { CK_DEBUG: 'true' } });
            assert.ok(contextOf(traced.stdout).includes('hooks-context'));
            assert.ok(traced.stderr.includes('[file-convention-inject] delivered: hooks-context=full'), traced.stderr);
            const repeat = await spawnHook(fx, { ...input, session_id: 'session-traced' }, { env: { CK_DEBUG: '1' } });
            assert.equal(repeat.stdout, '');
            assert.ok(repeat.stderr.includes('skip hooks-context: already present in main'), repeat.stderr);
        })
    },

    // TC-PFCI-052: A broken configuration never disrupts work
    {
        name: 'TC-PFCI-052 malformed config fail-open',
        fn: async () => withFixture(async fx => {
            const input = post(fx, 'Edit', '.claude/hooks/a.cjs');
            // Scenario: malformed configuration (and a list instead of an object)
            for (const raw of ['{ not json', '[1, 2]']) {
                fx.writeConfig(raw);
                assertSilent(await spawnHook(fx, input), `config ${raw}`);
                assert.ok(storeIsEmpty(fx));
            }
            // Scenario: malformed trigger information
            fx.writeConfig(enabled([hooksGroup()]));
            for (const raw of ['not json', '', '[]', 'null', JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: 'x' })]) {
                assertSilent(await spawnHook(fx, null, { raw }), `input ${raw}`);
            }
            assert.ok(storeIsEmpty(fx));
            // Scenario: one malformed pattern next to a valid class
            fx.writeConfig(enabled([{ name: 'broken', pathRegexes: ['(unclosed'], rules: ['never shown'] }, hooksGroup()]));
            const result = await spawnHook(fx, input);
            assert.equal(result.code, 0);
            assert.equal(result.stderr, '');
            const context = contextOf(result.stdout);
            assert.ok(context.includes('hooks-context') && !context.includes('broken'), context);
            assert.equal(ledger.readRecord(fx.store, 'session-1', 'main', 'broken'), null);
            assert.ok(ledger.readRecord(fx.store, 'session-1', 'main', 'hooks-context'));
        })
    },

    // TC-PFCI-053: Unwritable delivery memory never disrupts work
    {
        name: 'TC-PFCI-053 unwritable store fail-open',
        fn: async () => withFixture(async fx => {
            // Given delivery memory cannot be written (the memory location is a regular file)
            fx.writeConfig(enabled([hooksGroup()]));
            const blocked = fx.write('memory-is-a-file', 'x');
            const input = post(fx, 'Edit', '.claude/hooks/a.cjs');
            // When matched files change repeatedly / Then silent every time (no flooding)
            for (let i = 0; i < 2; i++) assertSilent(await spawnHook(fx, input, { env: { CK_CONVENTIONS_DIR: blocked } }), `attempt ${i}`);
            assert.equal(fs.readFileSync(blocked, 'utf8'), 'x');
            // Edge: memory becomes writable → normal delivery resumes
            assert.ok(contextOf((await spawnHook(fx, input)).stdout).includes('hooks-context'));
            // Edge: a record that cannot be written leaves no temporary file behind
            const occupied = ledger.recordFile(fx.store, 'session-occupied', 'main', 'hooks-context');
            fs.mkdirSync(occupied, { recursive: true });
            assert.equal(ledger.writeRecordAtomic(fx.store, 'session-occupied', 'main', 'hooks-context', { hash: 'h', deliveredAt: NOW, transcriptBytes: null, form: 'full' }), false);
            assert.deepEqual(fs.readdirSync(path.dirname(occupied)).filter(name => name.endsWith('.tmp')), []);

            // Store hygiene: only old delivery-memory folders are removed, never anything else under the store
            const hygiene = path.join(fx.root, 'hygiene');
            const make = (rel, content = '{}') => plant(hygiene, rel, content);
            const age = (dir, ageMs) => backdate(path.join(hygiene, dir), ageMs);
            // `own` is what makes a folder ours. The sweep deletes recursively and the store root
            // is overridable to any path, so shape can never decide ownership: a folder holding
            // `main/<name>.json` is an ordinary cache layout as much as it is delivery memory.
            const own = session => ledger.markSessionOwned(hygiene, session);
            make('old-session/main/hooks-context.json');
            make('old-session/_session.json');
            make('old-helper/agent-h1/_scan.json');
            make('fresh-session/main/hooks-context.json');
            make('mixed-age/main/hooks-context.json');
            make('foreign-source/main/a.json');
            make('foreign-source/src/app.js', 'code');
            make('nested/main/deeper/a.json');
            make('other-files/notes.txt', 'mine');
            // A stranger's folder that happens to be shaped exactly like delivery memory, with no
            // marker: shape alone must never authorize `rm -r` on someone else's build cache.
            make('my-build-cache/main/bundle.json', '{"files":[]}');
            for (const session of ['old-session', 'old-helper', 'fresh-session', 'mixed-age']) own(session);
            age('old-session', 8 * DAY);
            age('old-helper', 8 * DAY);
            age('mixed-age', 8 * DAY);
            make('mixed-age/agent-new/x.lock');
            age('foreign-source', 8 * DAY);
            age('nested', 8 * DAY);
            age('other-files', 8 * DAY);
            age('my-build-cache', 8 * DAY);
            assert.equal(ledger.pruneStale(hygiene, Date.now()), 2);
            assert.deepEqual(fs.readdirSync(hygiene).sort(), ['foreign-source', 'fresh-session', 'mixed-age', 'my-build-cache', 'nested', 'other-files']);
            assert.ok(fs.existsSync(path.join(hygiene, 'my-build-cache', 'main', 'bundle.json')), 'an unmarked folder is never ours, whatever its shape');
            // And a marker alone is not enough either — shape still has to match
            make('marked-but-foreign/main/a.json');
            make('marked-but-foreign/src/app.js', 'code');
            own('marked-but-foreign');
            age('marked-but-foreign', 8 * DAY);
            assert.equal(ledger.pruneStale(hygiene, Date.now()), 0);
            assert.ok(fs.existsSync(path.join(hygiene, 'marked-but-foreign', 'src', 'app.js')));
            // Boundary: exactly seven days old is kept; just over is removed
            make('edge/main/a.json');
            own('edge');
            const now = Date.now();
            const stamp = (now - ledger.PRUNE_AGE_MS) / 1000;
            for (const target of [path.join(hygiene, 'edge', 'main', 'a.json'), path.join(hygiene, 'edge', 'main'), path.join(hygiene, 'edge', '_owner.json'), path.join(hygiene, 'edge')]) fs.utimesSync(target, stamp, stamp);
            assert.equal(ledger.pruneStale(hygiene, now), 0);
            assert.equal(ledger.pruneStale(hygiene, now + 1000), 1);
            // Edge: removals per sweep are bounded
            for (let i = 0; i < 3; i++) make(`bulk-${i}/main/a.json`);
            for (let i = 0; i < 3; i++) own(`bulk-${i}`);
            for (let i = 0; i < 3; i++) age(`bulk-${i}`, 8 * DAY);
            assert.equal(ledger.pruneStale(hygiene, Date.now(), ledger.PRUNE_AGE_MS, 2), 2);
            assert.equal(fs.readdirSync(hygiene).filter(name => name.startsWith('bulk-')).length, 1);
            // Edge: the delivery path sweeps at most once per interval, recording when it last ran
            make('late/main/a.json');
            own('late');
            age('late', 8 * DAY);
            const sweepAt = Date.now();
            assert.equal(ledger.maybePrune(hygiene, sweepAt), 2, 'first sweep removes the remaining old folders');
            make('later/main/a.json');
            own('later');
            age('later', 8 * DAY);
            assert.equal(ledger.maybePrune(hygiene, sweepAt + ledger.PRUNE_INTERVAL_MS - 1), 0, 'within the interval: no sweep');
            assert.ok(fs.existsSync(path.join(hygiene, 'later')));
            assert.equal(ledger.maybePrune(hygiene, sweepAt + ledger.PRUNE_INTERVAL_MS), 1, 'interval elapsed: sweep again');
            assert.ok(!fs.existsSync(path.join(hygiene, 'later')));
        })
    },

    // TC-PFCI-054: Simultaneous triggers deliver each class once
    {
        name: 'TC-PFCI-054 concurrent triggers inject once',
        fn: async () => withFixture(async fx => {
            const group = hooksGroup();
            const config = enabled([group]);
            // Forced interleaving: A read "absent", then B completed its record before A's claim → A must drop
            let interleaved = false;
            const context = await deliver(fx, config, post(fx, 'Read', '.claude/hooks/a.cjs'), {
                afterLock: entry => {
                    interleaved = true;
                    ledger.writeRecordAtomic(fx.store, 'session-1', 'main', entry.name, { hash: hashOf(group), deliveredAt: NOW, transcriptBytes: null, form: 'full' });
                }
            });
            assert.ok(interleaved);
            assert.equal(context, '', 'post-lock re-check drops a class a peer just delivered');
            assert.ok(!fs.existsSync(ledger.lockFile(fx.store, 'session-1', 'main', 'hooks-context')), 'claim released');
            // Given no delivery yet / When five hook sources are read at the same moment / Then exactly one section
            fx.writeConfig(config);
            const reads = [1, 2, 3, 4, 5].map(i => spawnHook(fx, post(fx, 'Read', `.claude/hooks/f${i}.cjs`, { session_id: 'session-par' })));
            const results = await Promise.all(reads);
            results.forEach(r => { assert.equal(r.code, 0); assert.equal(r.stderr, ''); });
            assert.equal(results.reduce((n, r) => n + count(r.stdout, '[[convention:hooks-context@'), 0), 1);
            // Boundary counter-case: the same five evaluations in five helper contexts → five deliveries
            const helpers = await Promise.all([1, 2, 3, 4, 5].map(i => spawnHook(fx, post(fx, 'Read', `.claude/hooks/f${i}.cjs`, { session_id: 'session-par', agent_id: `h${i}` }))));
            assert.equal(helpers.reduce((n, r) => n + count(r.stdout, '[[convention:hooks-context@'), 0), 5);
        })
    },

    // TC-PFCI-055: An interrupted delivery is delivered again
    {
        name: 'TC-PFCI-055 stale lock redelivers',
        fn: async () => withFixture(async fx => {
            const config = enabled([hooksGroup()]);
            const input = post(fx, 'Edit', '.claude/hooks/a.cjs');
            const lock = ledger.lockFile(fx.store, 'session-1', 'main', 'hooks-context');
            const leaveMark = ageMs => {
                fs.mkdirSync(path.dirname(lock), { recursive: true });
                fs.writeFileSync(lock, '{}');
                const seconds = (NOW - ageMs) / 1000;
                fs.utimesSync(lock, seconds, seconds);
            };
            // Given an interrupted delivery left a mark 9 s ago / When a change happens / Then skipped
            leaveMark(9000);
            assert.equal(await deliver(fx, config, input), '');
            assert.ok(fs.existsSync(lock), 'fresh mark respected');
            // When the mark is 11 s old (and exactly 10 s: stale) / Then delivered, recorded, mark cleared
            for (const age of [11000, 10000]) {
                fs.rmSync(path.join(fx.store, 'session-1'), { recursive: true, force: true });
                leaveMark(age);
                assert.ok((await deliver(fx, config, input)).includes('hooks-context'), `age ${age}`);
                assert.ok(ledger.readRecord(fx.store, 'session-1', 'main', 'hooks-context'), `age ${age} recorded`);
                assert.ok(!fs.existsSync(lock), `age ${age} mark cleared`);
            }
            // And a delivery the host did not accept leaves no record, so the next trigger delivers
            const failedSession = { ...input, session_id: 'session-unaccepted' };
            assert.equal(await deliver(fx, config, failedSession, { write: (text, done) => done(false) }), '');
            assert.equal(ledger.readRecord(fx.store, 'session-unaccepted', 'main', 'hooks-context'), null);
            assert.ok((await deliver(fx, config, failedSession)).includes('hooks-context'));
            // Edge: the real output channel reporting a write error counts as not accepted either
            const brokenSession = { ...input, session_id: 'session-broken-output' };
            const realWrite = process.stdout.write;
            let payload;
            process.stdout.write = (chunk, callback) => {
                if (typeof callback === 'function') callback(Object.assign(new Error('pipe closed'), { code: 'EPIPE' }));
                return false;
            };
            try {
                payload = await hook.run(brokenSession, { env: { CK_CONVENTIONS_DIR: fx.store }, projectDir: fx.project, config, now: NOW });
            } finally {
                process.stdout.write = realWrite;
            }
            assert.equal(payload, '');
            assert.equal(ledger.readRecord(fx.store, 'session-broken-output', 'main', 'hooks-context'), null);
            assert.ok(!fs.existsSync(ledger.lockFile(fx.store, 'session-broken-output', 'main', 'hooks-context')), 'claim released');
            // Edge: after a stale claim was taken over, the original holder's release leaves the new claim alone
            const shared = ledger.lockFile(fx.store, 'session-takeover', 'main', 'hooks-context');
            const firstToken = ledger.acquireLock(shared, NOW);
            assert.ok(firstToken);
            const staleSeconds = (NOW - 11000) / 1000;
            fs.utimesSync(shared, staleSeconds, staleSeconds);
            const secondToken = ledger.acquireLock(shared, NOW);
            assert.ok(secondToken && secondToken !== firstToken, 'stale claim taken over');
            ledger.releaseLock(shared, firstToken);
            assert.ok(fs.existsSync(shared), 'original holder cannot remove the new claim');
            ledger.releaseLock(shared, secondToken);
            assert.ok(!fs.existsSync(shared), 'current holder releases its claim');
        })
    },

    // TC-PFCI-056: Oversized reminders degrade by precedence
    {
        name: 'TC-PFCI-056 budget degrades by precedence',
        fn: async () => {
            // Given four matching classes ranked 1..4 sharing one reference document, each with a long rule
            const shared = 'docs/shared-conventions.md';
            const entries = [1, 2, 3, 4].map(i => entryOf({ name: `class-${i}`, pathRegexes: ['.'], priority: i * 100, referenceDocs: [shared], rules: [`Rule ${i} ${'w'.repeat(700)}`] }));
            const rels = ['src/file.cjs'];
            const huge = { maxChars: 1e9 };
            const refsOnly = entry => ({ ...entry, rules: [] });
            // Tags are fixed-width (name + 8 hex), so stripping rules changes length only by the rule lines.
            const lengthOf = forms => conventions.buildDigest(
                entries.filter((e, i) => forms[i] !== 'O').map(e => (forms[entries.indexOf(e)] === 'R' ? refsOnly(e) : e)), rels, huge).text.length;
            const expectForms = (limit, expected) => {
                const { text, forms } = conventions.buildDigest(entries, rels, { maxChars: limit });
                assert.deepEqual(entries.map(e => forms[e.name]), expected, `limit ${limit}`);
                assert.ok(text.length <= limit, `limit ${limit} respected`);
                return text;
            };
            const F = 'full';
            const R = 'references';
            // When the limit fits exactly all full sections → nothing reduced
            expectForms(lengthOf(['F', 'F', 'F', 'F']), [F, F, F, F]);
            // Scenario: only the lowest class shrinks
            expectForms(lengthOf(['F', 'F', 'F', 'R']), [F, F, F, R]);
            // Boundary: one character less → shrinking continues upward
            expectForms(lengthOf(['F', 'F', 'F', 'R']) - 1, [F, F, R, R]);
            expectForms(lengthOf(['F', 'F', 'R', 'R']), [F, F, R, R]);
            // Scenario: lowest class left out once every class is references-only and still too long
            const text = expectForms(lengthOf(['R', 'R', 'R', 'O']), [R, R, R, 'omitted']);
            assert.ok(!text.includes('class-4'));
            // Edge: opening and closing lines alone exceed the limit → nothing delivered
            const longDocGroup = { name: 'wide', pathRegexes: ['.'], referenceDocs: [`docs/${'d'.repeat(600)}.md`] };
            const longDoc = entryOf(longDocGroup);
            assert.equal(conventions.buildDigest([longDoc], rels, { maxChars: 500 }).text, '');
            // And the real delivery then prints nothing, records nothing and leaves no claim behind
            await withFixture(async fx => {
                const payload = await hook.run(post(fx, 'Edit', 'src/file.cjs'), {
                    env: { CK_CONVENTIONS_DIR: fx.store }, projectDir: fx.project, config: enabled([longDocGroup], { maxChars: 500 }),
                    now: NOW, write: (text, done) => done(true)
                });
                assert.ok(!payload, `no output: ${payload}`);
                assert.equal(ledger.readRecord(fx.store, 'session-1', 'main', 'wide'), null);
                assert.ok(!fs.existsSync(ledger.lockFile(fx.store, 'session-1', 'main', 'wide')), 'claim released');
            });

            // Business data state (real delivery): references-only classes are recorded, a left-out class is not
            await withFixture(async fx => {
                const longShared = `docs/${'s'.repeat(200)}.md`;
                const groups = [1, 2, 3, 4].map(i => ({ name: `class-${i}`, pathRegexes: ['.'], priority: i * 100, referenceDocs: [longShared], rules: [`Rule ${i} ${'w'.repeat(700)}`] }));
                const hookEntries = conventions.injectableEntries({ contextGroups: groups });
                const limit = conventions.buildDigest(hookEntries.slice(0, 3).map(refsOnly), rels, huge).text.length;
                assert.ok(limit >= 500 && limit <= 10000, `limit ${limit} is a valid setting`);
                const config = enabled(groups, { maxChars: limit });
                const input = post(fx, 'Edit', 'src/file.cjs');
                // When the file changes under that limit
                const first = await deliver(fx, config, input);
                assert.ok(first.includes('class-3') && !first.includes('class-4'), first);
                const recordOf = name => ledger.readRecord(fx.store, 'session-1', 'main', name);
                assert.deepEqual([1, 2, 3].map(i => recordOf(`class-${i}`).form), [R, R, R]);
                assert.equal(recordOf('class-4'), null);
                // Then the left-out class is delivered on the next trigger (and only it)
                const second = await deliver(fx, config, input, { now: NOW + 1000 });
                assert.ok(second.includes(conventions.conventionTag(hookEntries[3])), second);
                assert.ok(!/\[\[convention:class-[123]@/.test(second), second);
                assert.ok(recordOf('class-4'));
                // And the memory itself refuses to record or honour a left-out form
                const omitted = { hash: conventions.groupHash(hookEntries[0]), deliveredAt: NOW, transcriptBytes: null, form: 'omitted' };
                assert.equal(ledger.writeRecordAtomic(fx.store, 'session-x', 'main', 'class-1', omitted), false);
                assert.equal(ledger.readRecord(fx.store, 'session-x', 'main', 'class-1'), null);
                const ctx = { lastCompactionAt: -Infinity, transcriptSize: null, now: NOW };
                const settings = conventions.resolveSettings(config);
                assert.equal(ledger.isPresent(omitted, omitted.hash, ctx, settings), false);
                assert.equal(ledger.isPresent({ ...omitted, form: R }, omitted.hash, ctx, settings), true);
            });
        }
    },

    // TC-PFCI-061: Reminder shape: critical first and last, tagged, no repeated rule
    {
        name: 'TC-PFCI-061 digest shape',
        fn: async () => withFixture(async fx => {
            // Given two matching classes sharing the rule "Regenerate counts"
            const a = { name: 'class-a', pathRegexes: [], pathGlobs: ['src/**'], priority: 100, referenceDocs: ['docs/a.md'], rules: ['Regenerate counts'] };
            const b = { name: 'class-b', pathRegexes: [], pathGlobs: ['src/**'], priority: 500, referenceDocs: ['docs/b.md'], rules: ['Regenerate counts', 'Other'] };
            // When the file is changed
            const context = await deliver(fx, enabled([a, b]), post(fx, 'Edit', 'src/x.cjs'));
            const lines = context.split('\n');
            // Then the first line names the must-read references and the last repeats them with the lookup
            assert.equal(lines[0], '[conventions] src/x.cjs — MUST read first: docs/a.md, docs/b.md');
            // The Bash clause is part of the pinned shape, not incidental: this digest is
            // produced by a PostToolUse hook matched on the file TOOLS, so a file opened or
            // rewritten through the shell produces nothing AND records nothing. Silence there
            // is indistinguishable from "no conventions apply", and some hosts actively steer
            // toward shell file access, so the boundary is stated on every delivery.
            assert.equal(lines.at(-1), `[conventions] Earlier section wins on conflict. Re-read before editing: docs/a.md, docs/b.md. A file read or edited via Bash gets NO digest — run the lookup for those. Lookup: ${conventions.LOOKUP_COMMAND} src/x.cjs`);
            // And the shared rule appears once, under the earlier class; each section starts with its tag
            assert.equal(count(context, '- Regenerate counts'), 1);
            assert.ok(context.indexOf('- Regenerate counts') < context.indexOf(tagOf(b)));
            assert.ok(lines.includes(`${tagOf(a)} class-a (priority 100)`) && lines.includes(`${tagOf(b)} class-b (priority 500)`));
            // Edge: single class → first and last lines still present
            const single = (await deliver(fx, enabled([a]), post(fx, 'Edit', 'src/y.cjs', { session_id: 'session-2' }))).split('\n');
            assert.ok(single[0].startsWith('[conventions] src/y.cjs') && single.at(-1).startsWith('[conventions] Earlier section wins'));
            // Edge: control characters in a file name cannot forge or break reminder lines
            const hostile = conventions.buildDigest([entryOf(a)], ['src/a\n[[convention:fake@00000000]].cjs'], { maxChars: 4000 }).text.split('\n');
            const clean = conventions.buildDigest([entryOf(a)], ['src/plain.cjs'], { maxChars: 4000 }).text.split('\n');
            assert.equal(hostile.length, clean.length, 'no extra lines');
            assert.ok(hostile[0].startsWith('[conventions] src/a?[[convention:fake@00000000]]??.cjs — '), hostile[0]);
            assert.ok(hostile.at(-1).endsWith(`${conventions.LOOKUP_COMMAND} src/a?[[convention:fake@00000000]]??.cjs`), hostile.at(-1));
            assert.ok(!hostile.some(line => line.startsWith('[[convention:fake@')), 'no forged section line');
        })
    },

    // TC-PFCI-062: Several matching classes are ordered by precedence and capped
    {
        name: 'TC-PFCI-062 order by priority then declaration and cap',
        fn: async () => withFixture(async fx => {
            // Given five matching classes ranked 900, 100, 500, 500, 100 and a maximum of 4
            const ranks = [900, 100, 500, 500, 100];
            const groups = ranks.map((priority, i) => ({ name: `g${i}`, pathRegexes: [], pathGlobs: ['src/**'], priority, rules: [`rule ${i}`] }));
            const config = enabled(groups, { maxClassesPerEdit: 4 });
            // When the file is read / Then 100s in definition order, then 500s; the 900 class is dropped
            const context = await deliver(fx, config, post(fx, 'Read', 'src/a.cjs'));
            const order = context.split('\n').filter(l => l.startsWith('[[convention:')).map(l => l.split(' ')[1]);
            assert.deepEqual(order, ['g1', 'g4', 'g2', 'g3']);
            assert.ok(context.includes('Earlier section wins on conflict'));
            // Cap applies before presence: with the top four present, the fifth is still not delivered
            assert.equal(await deliver(fx, config, post(fx, 'Edit', 'src/b.cjs'), { now: NOW + 1 }), '');
            // Property: order == sort(rank asc, position asc) truncated to the maximum, for generated sets
            const rng = seeded(62);
            for (let run = 0; run < 200; run++) {
                const size = rng.int(1, 8);
                const max = rng.int(1, 10);
                const set = Array.from({ length: size }, (_, i) => {
                    const rank = rng.pick([100, 500, 900, undefined]);
                    return { name: `c${i}`, pathRegexes: [rng.pick(['/src/', 'src'])], rules: ['r'], ...(rank === undefined ? {} : { priority: rank }) };
                });
                const expected = set.map((g, i) => ({ name: g.name, rank: g.priority ?? 500, i }))
                    .sort((x, y) => (x.rank - y.rank) || (x.i - y.i)).slice(0, max).map(x => x.name);
                const actual = conventions.matchGroups(enabled(set, { maxClassesPerEdit: max }), ['src/a.cjs']).map(e => e.name);
                assert.deepEqual(actual, expected, JSON.stringify({ set, max }));
            }
            // Boundary: exactly the maximum → none dropped; maximum + 1 → only the last in sorted order dropped
            const four = groups.slice(1);
            assert.equal(conventions.matchGroups(enabled(four, { maxClassesPerEdit: 4 }), ['src/a.cjs']).length, 4);
            assert.deepEqual(conventions.matchGroups(config, ['src/a.cjs']).map(e => e.name), ['g1', 'g4', 'g2', 'g3']);
        })
    },

    // TC-PFCI-071: Presence decision holds for every combination
    {
        name: 'TC-PFCI-071 presence decision table',
        fn: async () => withFixture(async fx => {
            const settings = conventions.resolveSettings(enabled([]));
            const LIMIT = settings.reinjectAfterBytes;
            const deliveredAt = NOW;
            for (const versionMatch of [true, false]) {
                for (const afterCondensation of [true, false]) {
                    for (const belowLimit of [true, false]) {
                        // Given a record in this combination
                        const record = { hash: versionMatch ? 'current' : 'old', deliveredAt, transcriptBytes: 1000, form: 'full' };
                        const ctx = {
                            lastCompactionAt: afterCondensation ? deliveredAt - 1 : deliveredAt + 1,
                            transcriptSize: 1000 + (belowLimit ? LIMIT - 1 : LIMIT),
                            now: NOW
                        };
                        // Then skip == all three hold
                        assert.equal(ledger.isPresent(record, 'current', ctx, settings), versionMatch && afterCondensation && belowLimit,
                            JSON.stringify({ versionMatch, afterCondensation, belowLimit }));
                    }
                }
            }
            // Boundary counter-case: delivery at exactly the condensation time counts as absent
            const record = { hash: 'current', deliveredAt, transcriptBytes: 1000, form: 'full' };
            assert.equal(ledger.isPresent(record, 'current', { lastCompactionAt: deliveredAt, transcriptSize: 1000, now: NOW }, settings), false);
            assert.equal(ledger.isPresent(record, 'current', { lastCompactionAt: -Infinity, transcriptSize: 1000, now: NOW }, settings), true);
            // Boundary: a record stamped in the future is absent on BOTH distance paths — the byte
            // path rejects negative growth, and the age path must reject negative elapsed time the
            // same way, or a backwards clock suppresses the reminder for the whole window
            const aged = { hash: 'current', deliveredAt: NOW + 10 * MINUTE, transcriptBytes: 1000, form: 'full' };
            assert.equal(ledger.isPresent(aged, 'current', { lastCompactionAt: -Infinity, transcriptSize: 900, now: NOW }, settings), false, 'byte path rejects a shrunken history');
            assert.equal(ledger.isPresent(aged, 'current', { lastCompactionAt: NOW - 1, transcriptSize: null, now: NOW }, settings), false, 'age path rejects a future delivery');
            assert.equal(ledger.isPresent(aged, 'current', { lastCompactionAt: -Infinity, transcriptSize: null, now: NOW }, settings), false, 'blind age path rejects a future delivery');
            // And the table drives real delivery: a record at the current version suppresses, an old one does not
            const group = hooksGroup();
            const input = post(fx, 'Edit', '.claude/hooks/a.cjs');
            ledger.writeRecordAtomic(fx.store, 'session-1', 'main', 'hooks-context', { hash: hashOf(group), deliveredAt: NOW - 1, transcriptBytes: null, form: 'full' });
            assert.equal(await deliver(fx, enabled([group]), input), '');
            ledger.writeRecordAtomic(fx.store, 'session-1', 'main', 'hooks-context', { hash: 'deadbeef', deliveredAt: NOW - 1, transcriptBytes: null, form: 'full' });
            assert.ok(await deliver(fx, enabled([group]), input));
            // Edge: a record of a different class name is ignored
            ledger.writeRecordAtomic(fx.store, 'session-9', 'main', 'other', { hash: hashOf(group), deliveredAt: NOW, transcriptBytes: null, form: 'full' });
            assert.equal(ledger.readRecord(fx.store, 'session-9', 'main', 'hooks-context'), null);
        })
    },

    // TC-PFCI-072: Membership decision holds for every combination
    {
        name: 'TC-PFCI-072 membership decision table',
        fn: async () => withFixture(async fx => {
            const filters = [undefined, ['.cjs'], ['.md']];
            const includes = [
                { pathRegexes: ['nomatch/'] },
                { pathRegexes: ['/src/feature/'] },
                { pathRegexes: [], pathGlobs: ['src/**/*.cjs'] },
                { pathRegexes: [], fileNameRegexes: ['^widget\\.cjs$'] },
                { pathRegexes: ['nomatch/'], pathGlobs: ['src/**/*.cjs'] }
            ];
            const excludes = [{}, { excludePathRegexes: ['/feature/'] }, { excludePathGlobs: ['src/feature/**'] }, { excludePathRegexes: ['nomatch'] }];
            const native = conventions.toRepoRelative(path.join(fx.project, 'src', 'feature', 'widget.cjs'), fx.project);
            const forward = conventions.toRepoRelative(`${fx.project.replace(/\\/g, '/')}/src/feature/widget.cjs`, fx.project);
            assert.equal(native, 'src/feature/widget.cjs');
            assert.equal(forward, 'src/feature/widget.cjs');
            const styles = [native, 'SRC/FEATURE/WIDGET.CJS'];
            for (const [fi, filter] of filters.entries()) {
                for (const [ii, include] of includes.entries()) {
                    for (const [ei, exclude] of excludes.entries()) {
                        const group = { name: 'g', rules: ['r'], ...include, ...exclude, ...(filter ? { fileExtensions: filter } : {}) };
                        const expected = (fi !== 2) && ii !== 0 && (ei === 0 || ei === 3);
                        for (const rel of styles) assert.equal(conventions.groupMatches(group, rel), expected, JSON.stringify({ group, rel }));
                    }
                }
            }
            // And the decision drives real delivery in a fresh conversation
            const member = { name: 'g', pathRegexes: [], pathGlobs: ['src/**/*.cjs'], rules: ['r'] };
            assert.ok(await deliver(fx, enabled([member]), post(fx, 'Read', 'src/feature/widget.cjs')));
            assert.equal(await deliver(fx, enabled([{ ...member, excludePathGlobs: ['src/feature/**'] }]), post(fx, 'Read', 'src/feature/widget.cjs', { session_id: 'session-2' })), '');
            // Edge: a path beyond the length cap is not evaluated
            assert.equal(conventions.toRepoRelative(`src/${'a'.repeat(conventions.PATH_CAP)}.cjs`, fx.project), null);
            // Edge: equivalent wildcard spellings compile to the same pattern (repeated any-depth, leading ./, back slashes)
            const canonical = conventions.globToRegExp('**/*.zzz').source;
            for (const spelling of ['**/**/**/*.zzz', './**/*.zzz', '**\\**\\*.zzz', '.\\**/**/*.zzz']) {
                assert.equal(conventions.globToRegExp(spelling).source, canonical, spelling);
            }
            assert.notEqual(conventions.globToRegExp('*/*.zzz').source, canonical, 'one level is not any depth');
        })
    },

    // TC-PFCI-073: Merge never removes classes or alters maintainer work
    {
        name: 'TC-PFCI-073 merge property additive',
        fn: () => {
            const rng = seeded(73);
            const names = ['a', 'b', 'c', 'd', 'e', 'f'];
            const make = (name, variant) => ({ name, pathRegexes: [], pathGlobs: [`${name}/${variant}/**`], rules: [`rule ${variant}`] });
            for (let run = 0; run < 300; run++) {
                // Given any mix of maintainer, edited detected and unedited detected classes
                const existing = names.filter(() => rng.next() < 0.6).map(name => {
                    const base = make(name, rng.int(0, 2));
                    const kind = rng.pick(['user', 'unedited', 'edited', 'no-origin']);
                    if (kind === 'user') return { ...base, origin: 'user' };
                    if (kind === 'no-origin') return base;
                    const stamped = { ...base, origin: 'detected', detectedFingerprint: merge.fingerprintGroup(base) };
                    return kind === 'edited' ? { ...stamped, rules: ['maintainer edit'] } : stamped;
                });
                const detected = names.filter(() => rng.next() < 0.5).map(name => make(name, rng.int(0, 2)));
                const snapshot = JSON.parse(JSON.stringify(existing));
                // When setup merges new detection results
                const result = merge.mergeDetected(existing, detected);
                // Then every previous class is still listed and only unedited detected classes may change
                const resultNames = result.groups.map(g => g.name);
                for (const before of snapshot) {
                    assert.ok(resultNames.includes(before.name), `kept ${before.name}`);
                    const after = result.groups.find(g => g.name === before.name);
                    const unedited = before.origin === 'detected' && before.detectedFingerprint === merge.fingerprintGroup(before);
                    if (!unedited) assert.deepEqual(after, before, `unchanged ${before.name}`);
                }
                assert.equal(result.added.length + result.refreshed.length + result.kept.length, detected.length);
                assert.deepEqual(existing, snapshot, 'input not mutated');
                // Boundary counter-case: an unedited detected class with new detection is allowed to change
                for (const name of result.refreshed) {
                    const before = snapshot.find(g => g.name === name);
                    assert.ok(before.origin === 'detected' && before.detectedFingerprint === merge.fingerprintGroup(before));
                }
            }
            // Edge: empty detection → result equals existing
            const only = [make('a', 0)];
            assert.deepEqual(merge.mergeDetected(only, []).groups, only);
        }
    },

    // TC-PFCI-074: Reminder never exceeds the limit and never cuts a line
    {
        name: 'TC-PFCI-074 budget property',
        fn: () => {
            const rng = seeded(74);
            const words = ['alpha', 'beta', 'gamma', 'δέλτα', '🙂emoji', 'long-token-with-dashes'];
            for (let run = 0; run < 300; run++) {
                // Given any 1..10 classes with rules of any length and any limit in range
                const entries = Array.from({ length: rng.int(1, 10) }, (_, i) => entryOf({
                    name: `k${i}`, pathRegexes: ['.'], priority: rng.pick([100, 500, 900]),
                    rules: Array.from({ length: rng.int(0, 4) }, () => Array.from({ length: rng.int(1, 60) }, () => rng.pick(words)).join(' ')),
                    referenceDocs: rng.next() < 0.7 ? [`docs/${rng.pick(['a', 'b', 'c'])}.md`] : [],
                    skills: rng.next() < 0.3 ? ['spec'] : []
                })).filter(Boolean);
                if (!entries.length) continue;
                const limit = rng.int(500, 10000);
                const rels = ['src/file.cjs'];
                // When the reminder is built
                const { text, forms } = conventions.buildDigest(entries, rels, { maxChars: limit }, { fileExists: () => false });
                // Then it is within the limit and equals the whole-line rendering of the chosen forms
                assert.ok(text.length <= limit, `length ${text.length} <= ${limit}`);
                // References form = the section without its rules but with the class's own (unchanged) tag.
                const active = entries.filter(e => forms[e.name] !== 'omitted');
                const rendered = active.map(e => (forms[e.name] === 'references' ? { ...e, rules: [] } : e));
                let expected = rendered.length ? conventions.buildDigest(rendered, rels, { maxChars: 1e9 }, { fileExists: () => false }).text : '';
                active.forEach((entry, i) => { expected = expected.replace(conventions.conventionTag(rendered[i]), conventions.conventionTag(entry)); });
                assert.equal(text, expected);
            }
            // Boundary counter-case: first and last lines alone exceed the limit → nothing delivered
            const wide = entryOf({ name: 'wide', pathRegexes: ['.'], referenceDocs: [`docs/${'w'.repeat(600)}.md`] });
            assert.deepEqual(conventions.buildDigest([wide], ['a'], { maxChars: 500 }), { text: '', forms: { wide: 'omitted' } });
        }
    },

    // TC-PFCI-075: Parity between delivery, lookup and static instructions
    {
        name: 'TC-PFCI-075 parity property',
        fn: async () => withFixture(async fx => {
            const repoConfigPath = path.resolve(HOOKS_DIR, '..', '..', 'docs', 'project-config.json');
            const configs = [
                enabled([hooksGroup(), specGroup(), { name: 'styles', pathRegexes: [], pathGlobs: ['**/*.scss'], stylingDoc: 'docs/s.md' },
                    { name: 'unknown-protocol', pathRegexes: [], pathGlobs: ['tools/**'], skills: ['no-such-skill'], rules: ['Tool rule'] }])
            ];
            if (fs.existsSync(repoConfigPath)) configs.push(JSON.parse(fs.readFileSync(repoConfigPath, 'utf8')));
            // Generated valid configurations: every include form, rank, item mix and non-deliverable classes.
            // A location pattern renders as its readable path form; a file-name pattern as `name:<pattern>`.
            const regexRenderings = { [HOOKS_REGEX]: '/\\.claude/hooks/.*\\.cjs$**', '[\\\\/]src[\\\\/]': '/src/**' };
            const rng = seeded(75);
            for (let run = 0; run < 40; run++) {
                configs.push(enabled(Array.from({ length: rng.int(1, 6) }, (_, i) => {
                    const group = { name: `gen-${run}-${i}`, pathRegexes: [], priority: rng.pick([100, 500, 900]) };
                    const forms = rng.int(1, 7);
                    if (forms & 1) group.pathRegexes = [rng.pick(Object.keys(regexRenderings))];
                    if (forms & 2) group.pathGlobs = [rng.pick(['docs/**/*.md', 'src/**', '**/*.cjs'])];
                    if (forms & 4) group.fileNameRegexes = [rng.pick(['\\.test\\.cjs$', '^README'])];
                    if (rng.next() < 0.6) group.rules = [`Rule ${run}-${i}`];
                    if (rng.next() < 0.5) group.referenceDocs = [`docs/ref-${rng.int(1, 3)}.md`];
                    if (rng.next() < 0.3) group.skills = [rng.pick(['spec', 'integration-test'])];
                    if (rng.next() < 0.2) group.stylingDoc = 'docs/s.md';
                    if (rng.next() < 0.3) group.fileExtensions = [rng.pick(['.cjs', 'md', '.TS'])];
                    if (rng.next() < 0.3) group.excludePathGlobs = [rng.pick(['tmp/**', '**/dist/**'])];
                    if (rng.next() < 0.2) group.excludePathRegexes = [rng.pick(Object.keys(regexRenderings))];
                    return group;
                })));
            }
            for (const config of configs) {
                // Given any deliverable class / When its reminder items, static row, golden rules and lookup are compared
                const table = builders.buildSkillActivation(config) || '';
                const golden = builders.buildGoldenRules(config) || '';
                const entries = conventions.injectableEntries(config);
                for (const entry of entries) {
                    const row = table.split('\n').find(line => line.includes(conventions.conventionTag(entry)));
                    assert.ok(row, `static row for ${entry.name}`);
                    for (const rule of entry.rules) assert.ok(golden.includes(rule), `golden rule ${rule}`);
                    for (const item of [...entry.docs, ...entry.skills]) assert.ok(row.includes(`\`${item}\``), `${entry.name} row has ${item}`);
                    // And the row shows every include pattern of the class. Patterns render inside a
                    // markdown table cell, where the builder escapes `|` (e.g. an `(A|B)` alternation).
                    const cell = text => String(text).replace(/\|/g, '\\|');
                    const group = entry.group;
                    for (const regex of group.pathRegexes || []) {
                        if (regexRenderings[regex]) assert.equal(builders.activationPattern(regex), regexRenderings[regex], regex);
                        assert.ok(row.includes(`\`${cell(builders.activationPattern(regex))}\``), `${entry.name} row has location pattern ${regex}: ${row}`);
                    }
                    for (const glob of group.pathGlobs || []) assert.ok(row.includes(`\`${cell(glob)}\``), `${entry.name} row has ${glob}`);
                    for (const regex of group.fileNameRegexes || []) assert.ok(row.includes(`\`name:${cell(regex)}\``), `${entry.name} row has name:${regex}`);
                    // And the row shows the file-type filter and every exclusion (membership is filter AND include AND no exclude)
                    const patternCell = row.split(' | ')[0];
                    for (const ext of conventions.normalizedExtensions(group)) assert.ok(patternCell.includes(` ext `) && patternCell.includes(`\`${ext}\``), `${entry.name} row has type ${ext}: ${row}`);
                    for (const glob of group.excludePathGlobs || []) assert.ok(patternCell.includes(' · not ') && patternCell.includes(`\`${cell(glob)}\``), `${entry.name} row excludes ${glob}: ${row}`);
                    for (const regex of group.excludePathRegexes || []) assert.ok(patternCell.includes(`\`${cell(builders.activationPattern(regex))}\``), `${entry.name} row excludes ${regex}: ${row}`);
                    if (!conventions.normalizedExtensions(group).length) assert.ok(!patternCell.includes(' ext '), `${entry.name} no filter shown: ${row}`);
                }
                // Then non-deliverable classes are absent from the static table
                for (const group of config.contextGroups || []) {
                    if (!conventions.isInjectable(group)) assert.ok(!table.includes(`[[convention:${group.name}@`), group.name);
                }
                // And rows follow the same precedence order as delivery
                const rowOrder = conventions.injectableEntries(config)
                    .map(entry => ({ name: entry.name, at: table.indexOf(conventions.conventionTag(entry)) }))
                    .sort((a, b) => a.at - b.at).map(item => item.name);
                assert.deepEqual(rowOrder, conventions.sortEntries(entries).map(entry => entry.name));
            }
            // And a mirrored copy of the static-table builder (no sibling hooks/lib) still renders tagged rows
            const mirror = path.join(fx.project, '.agents', 'skills', 'ai-context-refresh', 'scripts', 'section-builders.cjs');
            fs.mkdirSync(path.dirname(mirror), { recursive: true });
            fs.copyFileSync(require.resolve(path.resolve(HOOKS_DIR, '..', 'skills', 'ai-context-refresh', 'scripts', 'section-builders.cjs')), mirror);
            fs.mkdirSync(fx.abs('.claude/hooks/lib'), { recursive: true });
            fs.copyFileSync(LOOKUP_CLI, fx.abs('.claude/hooks/lib/file-conventions.cjs'));
            const savedRoot = process.env.CLAUDE_PROJECT_DIR;
            try {
                const guided = hooksGroup({ guideDoc: 'docs/guide.md' });
                process.env.CLAUDE_PROJECT_DIR = fx.project;
                const mirrored = require(mirror).buildSkillActivation(enabled([guided])) || '';
                assert.ok(mirrored.includes(tagOf(guided)), mirrored);
                // Counter-case: no framework lib anywhere → historical untagged guide-doc table
                process.env.CLAUDE_PROJECT_DIR = fx.root;
                const legacy = require(mirror).buildSkillActivation(enabled([guided])) || '';
                assert.ok(legacy.includes('`docs/guide.md`') && !legacy.includes('[[convention:'), legacy);
                // Edge: the generator's project directory resolves the project lib even when the environment points elsewhere
                assert.ok((require(mirror).buildSkillActivation(enabled([guided]), fx.project) || '').includes(tagOf(guided)), 'project directory argument wins');
                // Edge: a sibling lib lacking the renderer contract is skipped in favour of the project lib
                const siblingLib = path.join(fx.project, '.agents', 'hooks', 'lib', 'file-conventions.cjs');
                fs.mkdirSync(path.dirname(siblingLib), { recursive: true });
                // (every renderer function present, only the lookup command missing — an older or partial copy)
                fs.writeFileSync(siblingLib, "module.exports = { injectableEntries: () => [], sortEntries: e => e, conventionTag: () => '', normalizedExtensions: () => [] };\n");
                assert.ok((require(mirror).buildSkillActivation(enabled([guided]), fx.project) || '').includes(tagOf(guided)), 'incomplete sibling skipped');
                // Edge: when both are usable, the sibling lib wins
                delete require.cache[siblingLib];
                fs.writeFileSync(siblingLib, fs.readFileSync(LOOKUP_CLI, 'utf8').replace(`const LOOKUP_COMMAND = '${conventions.LOOKUP_COMMAND}'`, "const LOOKUP_COMMAND = 'sibling-lookup'"));
                const preferred = require(mirror).buildSkillActivation(enabled([guided]), fx.project) || '';
                assert.ok(preferred.includes('(no hook: `sibling-lookup <path>`)'), preferred);
                delete require.cache[siblingLib];
            } finally {
                if (savedRoot === undefined) delete process.env.CLAUDE_PROJECT_DIR;
                else process.env.CLAUDE_PROJECT_DIR = savedRoot;
                delete require.cache[mirror];
                delete require.cache[fx.abs('.claude/hooks/lib/file-conventions.cjs')];
                delete require.cache[path.join(fx.project, '.agents', 'hooks', 'lib', 'file-conventions.cjs')];
            }
            // And lookup text equals the reminder text in a fresh context (fixture configuration)
            const config = configs[0];
            for (const rel of ['.claude/hooks/a.cjs', 'docs/specs/X/README.Y.md', 'tools/run.cjs', 'src/a.scss']) {
                const looked = conventions.lookup(config, fx.abs(rel), { projectDir: fx.project }).text;
                const delivered = await deliver(fx, config, post(fx, 'Read', rel, { session_id: `parity-${rel}` }));
                assert.equal(looked, delivered, rel);
            }
            // Edge: unknown protocol name → name shown in both without a path
            assert.ok(conventions.lookup(config, fx.abs('tools/run.cjs'), { projectDir: fx.project }).text.includes('- skill: no-such-skill'));
        })
    },

    // TC-PFCI-076: No failure ever disrupts or alters the assistant's work
    {
        name: 'TC-PFCI-076 never-block property',
        fn: async () => withFixture(async fx => {
            const healthy = enabled([hooksGroup()]);
            const input = post(fx, 'Edit', '.claude/hooks/a.cjs');
            const lockFresh = () => {
                const lock = ledger.lockFile(fx.store, 'session-1', 'main', 'hooks-context');
                fs.mkdirSync(path.dirname(lock), { recursive: true });
                fs.writeFileSync(lock, '{}');
            };
            const reset = () => {
                fs.rmSync(fx.store, { recursive: true, force: true });
                fs.mkdirSync(fx.store);
                fs.rmSync(fx.abs('docs/project-config.json'), { recursive: true, force: true });
                fx.writeConfig(healthy);
            };
            const injections = [
                ['unreadable configuration', () => { fs.rmSync(fx.abs('docs/project-config.json')); fs.mkdirSync(fx.abs('docs/project-config.json')); }, {}],
                ['malformed configuration', () => fx.writeConfig('{"conventionInjection": {'), {}],
                ['malformed trigger information', () => {}, { raw: '{"tool_name": "Edit", "tool_input":' }],
                ['unwritable delivery memory', () => {}, { env: { CK_CONVENTIONS_DIR: fx.write('store-file', 'x') } }],
                ['invalid pattern', () => fx.writeConfig(enabled([{ ...hooksGroup(), pathRegexes: ['(bad'] }])), {}],
                ['fresh concurrent claim', lockFresh, {}],
                ['two failures at once', () => {}, { raw: 'garbage', env: { CK_CONVENTIONS_DIR: fx.write('store-file-2', 'x') } }]
            ];
            for (const [label, inject, options] of injections) {
                // Given one injected failure / When a matched file changes
                reset();
                inject();
                const result = await spawnHook(fx, input, options);
                // Then the operation completes unchanged: exit 0, no error text, no decision, well-formed or empty output
                assertSilent(result, label);
                assert.ok(result.ms < 10000, `${label}: no stall`);
                const recordFile = ledger.recordFile(fx.store, 'session-1', 'main', 'hooks-context');
                if (fs.existsSync(recordFile)) JSON.parse(fs.readFileSync(recordFile, 'utf8'));
            }
            // Boundary counter-case: healthy configuration and memory → reminder shown (the check is live)
            reset();
            assert.ok(contextOf((await spawnHook(fx, input)).stdout).includes('hooks-context'));

            // Trigger information reading (injected reader, clock and wait)
            const reader = buffers => {
                let next = 0;
                return {
                    read: (fd, buffer) => {
                        if (next >= buffers.length) return 0;
                        const chunk = buffers[next++];
                        chunk.copy(buffer);
                        return chunk.length;
                    }
                };
            };
            const inChunks = text => {
                const bytes = Buffer.from(text, 'utf8');
                const pieces = [];
                for (let at = 0; at < bytes.length; at += 64 * 1024) pieces.push(bytes.subarray(at, at + 64 * 1024));
                return pieces;
            };
            // Edge: a leading byte-order mark is ignored
            assert.deepEqual(hook.readInput(0, reader(inChunks('﻿{"tool_name":"Edit"}'))), { tool_name: 'Edit' });
            // Boundary: exactly the size cap is read; one byte more is refused
            const CAP = 1024 * 1024;
            const atCap = `{"k":"${'x'.repeat(CAP - 8)}"}`;
            assert.equal(Buffer.byteLength(atCap), CAP);
            assert.ok(hook.readInput(0, reader(inChunks(atCap))), 'exactly the cap is accepted');
            assert.equal(hook.readInput(0, reader(inChunks(`${atCap} `))), null, 'one byte over the cap is refused');
            // Edge: input that is not ready yet is retried after a short wait, then read
            let pending = 2;
            const late = reader(inChunks('{"a":1}'));
            assert.deepEqual(hook.readInput(0, {
                read: (fd, buffer) => {
                    if (pending-- > 0) throw Object.assign(new Error('not ready'), { code: 'EAGAIN' });
                    return late.read(fd, buffer);
                },
                sleep: () => {}
            }), { a: 1 });
            // Edge: input that never becomes ready → gives up after the deadline instead of spinning
            let clock = 0;
            let calls = 0;
            const waits = [];
            const result = hook.readInput(0, {
                now: () => clock,
                sleep: ms => { waits.push(ms); clock += ms; },
                read: () => {
                    calls++;
                    if (calls > 10000) throw Object.assign(new Error('runaway'), { code: 'EIO' });
                    throw Object.assign(new Error('not ready'), { code: 'EAGAIN' });
                }
            });
            assert.equal(result, null);
            assert.ok(clock >= 2000 && clock < 2100, `gave up at ${clock} ms`);
            assert.ok(calls <= 10000 && waits.every(ms => ms > 0), `bounded retries (${calls}) with real waits`);
        })
    },

    // TC-PFCI-077: Only successful reads and changes of project files trigger reminders
    {
        name: 'TC-PFCI-077 trigger relevance property',
        fn: async () => withFixture(async fx => {
            const config = enabled([{ name: 'catch-all', pathRegexes: [], pathGlobs: ['**/*'], rules: ['Everything'] }]);
            const sibling = `${fx.project}-sibling`;
            fs.mkdirSync(path.join(sibling, 'dir'), { recursive: true });
            fs.writeFileSync(path.join(sibling, 'file.cjs'), '');
            fx.write('dir/keep.txt');
            const locations = { inside: { file: fx.abs('file.cjs'), dir: fx.abs('dir') }, outside: { file: path.join(sibling, 'file.cjs'), dir: path.join(sibling, 'dir') } };
            const kinds = {
                read: loc => post(fx, 'Read', loc.file),
                create: loc => post(fx, 'Write', loc.file),
                change: loc => post(fx, 'Edit', loc.file),
                notebook: loc => post(fx, 'NotebookEdit', loc.file),
                move: loc => patch(fx, [`*** Update File: ${loc.file}`, `*** Move to: ${loc.file.replace('file.cjs', 'moved.cjs')}`]),
                removal: loc => patch(fx, [`*** Delete File: ${loc.file}`]),
                'folder read': loc => post(fx, 'Read', loc.dir),
                failed: loc => post(fx, 'Edit', loc.file, { tool_response: { success: false } })
            };
            let caseNo = 0;
            try {
                for (const [kind, build] of Object.entries(kinds)) {
                    for (const [where, loc] of Object.entries(locations)) {
                        // Given a fresh conversation / When the trigger kind runs at the location
                        const input = { ...build(loc), session_id: `case-${caseNo++}` };
                        const context = await deliver(fx, config, input);
                        // Then a reminder iff successful read/create/change/move of a file inside the project
                        const expected = ['read', 'create', 'change', 'notebook', 'move'].includes(kind) && where === 'inside';
                        assert.equal(Boolean(context), expected, `${kind} ${where}`);
                    }
                }
                // Boundary: a file directly in the project root → shown; a move from outside into the project → shown
                assert.ok(await deliver(fx, config, post(fx, 'Edit', 'root.cjs', { session_id: 'root' })));
                assert.ok(await deliver(fx, config, patch(fx, [`*** Update File: ${path.join(sibling, 'file.cjs')}`, '*** Move to: inside.cjs'], { session_id: 'into' })));
            } finally {
                fs.rmSync(sibling, { recursive: true, force: true });
            }
            // Parity with the registration: every tool the host is told to report is one the reminder understands
            const settingsFile = path.resolve(HOOKS_DIR, '..', 'settings.json');
            const registered = JSON.parse(fs.readFileSync(settingsFile, 'utf8')).hooks.PostToolUse
                .filter(block => (block.hooks || []).some(h => String(h.command).includes('file-convention-inject.cjs')));
            assert.equal(registered.length, 1, 'registered once for tool results');
            const tools = registered[0].matcher.split('|');
            for (const tool of tools) {
                assert.ok(hook.TRIGGER_TOOLS.has(tool), `${tool} is understood`);
                // And each registered tool yields a reminder for a project file
                assert.ok(await deliver(fx, config, post(fx, tool, 'registered.cjs', { session_id: `registered-${tool}` })), `${tool} delivers`);
            }
            assert.deepEqual([...hook.TRIGGER_TOOLS].filter(tool => !tools.includes(tool)), ['apply_patch'], 'only the Codex patch tool is outside the Claude matcher');
            // Event naming: the generic event field is honoured when the host-specific one is absent
            assert.ok(await deliver(fx, config, { ...post(fx, 'Edit', 'evt.cjs', { session_id: 'evt-generic' }), hook_event_name: undefined, event: 'PostToolUse' }));
            assert.ok(await deliver(fx, config, { ...post(fx, 'Edit', 'evt.cjs', { session_id: 'evt-tool-only' }), hook_event_name: undefined }), 'tool result without an event name');
            assert.equal(await deliver(fx, config, { ...post(fx, 'Edit', 'evt.cjs', { session_id: 'evt-pre' }), hook_event_name: undefined, event: 'PreToolUse' }), '', 'another event is ignored');
            assert.equal(await hook.run({ event: 'SessionStart', source: 'compact', session_id: 'evt-session' }, { env: { CK_CONVENTIONS_DIR: fx.store }, config, now: NOW }), '');
            assert.equal(ledger.readSessionCompaction(fx.store, 'evt-session'), NOW, 'condensation report via the generic event field');
        })
    },

    // TC-PFCI-078: Every reminder is framed, tagged and free of repeated rules
    {
        name: 'TC-PFCI-078 digest shape property',
        fn: () => {
            const rng = seeded(78);
            const rulePool = ['Regenerate counts', 'Keep hooks fail-open', 'Use CommonJS', 'Name tests by TC id', 'No domain in shared libs'];
            const docPool = ['docs/a.md', 'docs/b.md', 'docs/c.md'];
            for (let run = 0; run < 300; run++) {
                // Given any 1..10 matched classes with overlapping rules, documents and protocols
                const entries = Array.from({ length: rng.int(1, 10) }, (_, i) => entryOf({
                    name: `m${i}`, pathRegexes: ['.'], priority: rng.pick([100, 500, 900]),
                    rules: rulePool.filter(() => rng.next() < 0.4),
                    referenceDocs: docPool.filter(() => rng.next() < 0.4),
                    skills: rng.next() < 0.3 ? ['spec'] : []
                })).filter(Boolean);
                if (!entries.length) continue;
                const limit = rng.pick([1e9, rng.int(500, 3000)]);
                const { text, forms } = conventions.buildDigest(entries, ['src/x.cjs'], { maxChars: limit }, { fileExists: () => false });
                if (!text) continue;
                const active = entries.filter(e => forms[e.name] !== 'omitted');
                const lines = text.split('\n');
                const docs = [...new Set(active.flatMap(e => e.docs))];
                // Then the first and last lines name every must-read reference; the last names the lookup
                for (const doc of docs) {
                    assert.ok(lines[0].includes(doc), `first line has ${doc}`);
                    assert.ok(lines.at(-1).includes(doc), `last line has ${doc}`);
                }
                assert.ok(lines.at(-1).includes(conventions.LOOKUP_COMMAND));
                // And every delivered section (full or references-only) starts with its tag
                for (const entry of active) assert.ok(lines.includes(`${conventions.conventionTag(entry)} ${entry.name} (priority ${entry.priority})`), entry.name);
                // And no rule appears twice; a shown rule sits under the earliest full class that has it
                for (const rule of rulePool) {
                    const occurrences = lines.filter(l => l === `- ${rule}`).length;
                    assert.ok(occurrences <= 1, `${rule} once`);
                    if (occurrences === 1) {
                        const owner = active.find(e => forms[e.name] === 'full' && e.rules.includes(rule));
                        const ruleLine = lines.indexOf(`- ${rule}`);
                        const tagLine = lines.indexOf(`${conventions.conventionTag(owner)} ${owner.name} (priority ${owner.priority})`);
                        const nextTag = lines.findIndex((l, i) => i > tagLine && l.startsWith('[[convention:'));
                        assert.ok(ruleLine > tagLine && (nextTag === -1 || ruleLine < nextTag), `${rule} under ${owner.name}`);
                    }
                }
            }
            // Boundary counter-case: one class whose only item is one document → framed and tagged
            const lone = entryOf({ name: 'lone', pathRegexes: ['.'], referenceDocs: ['docs/only.md'] });
            const lines = conventions.buildDigest([lone], ['a.cjs'], { maxChars: 4000 }).text.split('\n');
            assert.ok(lines[0].includes('docs/only.md') && lines.at(-1).includes('docs/only.md'));
            assert.ok(lines[1].startsWith(conventions.conventionTag(lone)));
        }
    },

    // TC-PFCI-079: A delivery in one working context never suppresses another
    {
        name: 'TC-PFCI-079 context isolation property',
        fn: async () => withFixture(async fx => {
            const config = enabled([hooksGroup()]);
            const rng = seeded(79);
            for (let run = 0; run < 25; run++) {
                // Given any sequence of triggers across main and 1..5 identified helper contexts
                const session = `seq-${run}`;
                const contexts = ['', ...Array.from({ length: rng.int(1, 5) }, (_, i) => `helper-${i}`)];
                const delivered = new Set();
                for (let step = 0; step < 12; step++) {
                    const agent = rng.pick(contexts);
                    const input = post(fx, 'Edit', `.claude/hooks/f${step}.cjs`, { session_id: session, ...(agent ? { agent_id: agent } : {}) });
                    // When that context changes a file of the class
                    const shown = Boolean(await deliver(fx, config, input, { now: NOW + step }));
                    // Then it is reminded exactly when it has no delivery of its own
                    assert.equal(shown, !delivered.has(agent), `${session} step ${step} context "${agent}"`);
                    delivered.add(agent);
                }
            }
            // Boundary counter-case: no helper identity → helper work shares main and is suppressed
            assert.ok(await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: 'shared' })));
            assert.equal(await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/b.cjs', { session_id: 'shared' })), '');
            // Edge: helper identities differing only in unsafe characters stay apart
            assert.notEqual(ledger.scopeFor({ agent_id: 'a/b' }), ledger.scopeFor({ agent_id: 'a?b' }));
            assert.ok(await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: 'unsafe', agent_id: 'a/b' })));
            assert.ok(await deliver(fx, config, post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: 'unsafe', agent_id: 'a?b' })));
            // Edge: dot-only identities never become path segments (no history outside the transcript folder)
            const transcript = path.join(fx.transcripts, 'main.jsonl');
            for (const [agent, session] of [['h', '..'], ['..', 's'], ['.', 's'], ['h', '.']]) {
                assert.equal(ledger.transcriptPathFor({ agent_id: agent, session_id: session, transcript_path: transcript }), null, `${agent}/${session}`);
            }
            assert.equal(ledger.transcriptPathFor({ agent_id: 'h.1', session_id: 's-1', transcript_path: transcript }), path.join(fx.transcripts, 's-1', 'subagents', 'agent-h.1.jsonl'));
            for (const id of ['.', '..', '...']) assert.ok(!/^\.+$/.test(ledger.sanitizeId(id)), `sanitized ${id}`);
            // Edge: a class named like the memory's own state files never overwrites that state
            for (const name of ['_scan', '_session', '_prune']) {
                const file = path.basename(ledger.recordFile(fx.store, 's', 'main', name));
                assert.ok(!file.startsWith('_'), `${name} → ${file}`);
                assert.notEqual(file, path.basename(ledger.recordFile(fx.store, 's', 'main', `g${name}`)), `${name} distinct from g${name}`);
            }
            const scanClass = { name: '_scan', pathRegexes: [], pathGlobs: ['.claude/hooks/**'], rules: ['State-named class'] };
            fs.writeFileSync(transcript, 'x\n');
            const scanInput = post(fx, 'Edit', '.claude/hooks/a.cjs', { session_id: 'state-names', transcript_path: transcript });
            assert.ok(await deliver(fx, enabled([scanClass]), scanInput));
            const scanState = JSON.parse(fs.readFileSync(path.join(fx.store, 'state-names', 'main', '_scan.json'), 'utf8'));
            assert.deepEqual(Object.keys(scanState).sort(), ['lastBoundaryAt', 'offset'], 'scan state intact');
            assert.equal(await deliver(fx, enabled([scanClass]), scanInput, { now: NOW + 1 }), '', 'and the class is remembered');
        })
    }
];

module.exports = { name: 'file-convention-inject', tests };
