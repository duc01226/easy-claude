'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { captureTarget } = require('../lib/review-target.cjs');
const { resolveReviewPolicy, assignPrimaryGroups, buildReviewBatches } = require('../lib/review-rule-policy.cjs');

function fixture(fn) {
    const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'review-policy-')));
    const original = { ...process.env };
    const put = (relative, text) => { fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true }); fs.writeFileSync(path.join(root, relative), text); };
    try {
        for (const key of Object.keys(process.env)) if (/^(CK_|CLAUDE_|OCR_|OPENAI_|ANTHROPIC_|GIT_)/.test(key)) delete process.env[key];
        for (const key of ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP']) process.env[key] = root;
        put('.claude/skills/shared/protocol-groups.json', JSON.stringify({ groups: { universal: { tags: { 'fixture-universal': {} } } } }));
        put('.claude/skills/shared/protocols/fixture-universal.md', 'Fixture universal requirement');
        put('.claude/skills/changes-review/SKILL.md', 'Fixture review procedure');
        put('src/item.js', 'selected signal');
        return fn(root, put);
    } finally {
        for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
        Object.assign(process.env, original); fs.rmSync(root, { recursive: true, force: true });
    }
}
const configuration = extras => ({ project: { name: 'Fixture' }, referenceDocs: [], ...extras });
const freeze = (root, files = ['src/item.js']) => captureTarget({ rootDir: root, scope: 'files', files, outputDir: 'tmp/frozen/review' });
const resolve = (root, target, config) => resolveReviewPolicy({ rootDir: root, target, config, skillName: 'changes-review' });

test('TC-RVP-003 overlapping groups retain all standards and deterministic declaration ties', () => fixture((root, put) => {
    // Given overlapping classifications and an unmatched item.
    put('other.txt', 'other'); put('standards/a.md', 'Area A'); put('standards/b.md', 'Area B');
    const cfg = configuration({ contextGroups: [
        { name: 'first-class', pathRegexes: [], pathGlobs: ['src/**'], rules: ['first rule'], referenceDocs: ['standards/a.md'] },
        { name: 'second-class', pathRegexes: [], pathGlobs: ['**/*.js'], rules: ['second rule'], referenceDocs: ['standards/b.md'] }
    ], reviewGroups: [
        { id: 'first', priority: 100, contextGroups: ['first-class'], relatedGroups: ['second'] },
        { id: 'second', priority: 100, contextGroups: ['second-class'] },
        { id: 'default-priority', contextGroups: ['first-class'] }
    ] });
    const target = freeze(root, ['src/item.js', 'other.txt']);
    // When repeated frozen inputs are prepared.
    const policy = resolve(root, target, cfg); const assignments = assignPrimaryGroups(target, policy);
    // Then one first-declared winner coexists with every overlapping rule and general responsibility.
    assert.equal(policy.status, 'ready', JSON.stringify(policy.reasons));
    assert.deepEqual(assignments.map(a => a.groupId), ['first', 'general']);
    assert.deepEqual(assignPrimaryGroups(target, resolve(root, target, cfg)), assignments);
    assert.deepEqual(policy.overlaps[0].groupIds, ['first', 'second', 'default-priority']);
    for (const origin of ['standards/a.md', 'standards/b.md', 'context-group:first-class', 'context-group:second-class']) assert.ok(policy.ruleSources.some(s => s.origin === origin && s.entryIds.includes(target.entries[0].id)), origin);
    assert.deepEqual(policy.unmatched, [target.entries[1].id]);
    assert.deepEqual(buildReviewBatches(target, policy, assignments)[0].relatedGroupIds, ['second']);
}));

test('TC-RVP-012 complete inventory exceeds reminder limits and uses only most-specific overlays', () => fixture((root, put) => {
    // Given thirty applicable classes and three overlay tiers.
    const classes = Array.from({ length: 30 }, (_, n) => ({ name: `class-${n}`, pathRegexes: [], pathGlobs: ['src/**'], rules: [`rule-${n}`] }));
    put('docs/project-reference/skill-protocols-reference.md', '**Protocols directory:** `docs/project-protocols/`\n\n| Target | Scope | Name | Description | Updated | Body |\n| --- | --- | --- | --- | --- | --- |\n| * | all | broad | broad | 2026 | ignored |\n| *-review | glob | middle | middle | 2026 | ignored |\n| changes-review | exact | exact | exact | 2026 | ignored |\n'); // Default-root fixture; docs/project-config.json may relocate the project-reference root.
    put('docs/project-protocols/exact.md', '---\nname: exact\ndescription: exact\n---\nRequired exact overlay');
    const target = freeze(root);
    // When the uncapped policy inventory is resolved.
    const policy = resolve(root, target, configuration({ contextGroups: classes }));
    // Then every standard and the exact-tier body survive independently of reminders.
    assert.equal(policy.status, 'ready', JSON.stringify(policy.reasons));
    assert.equal(policy.ruleSources.filter(s => s.origin.startsWith('context-group:')).length, 30);
    assert.ok(policy.ruleSources.some(s => s.origin === 'docs/project-protocols/exact.md'));
    assert.equal(policy.ruleSources.some(s => /broad\.md|middle\.md/.test(s.origin)), false);
    fs.unlinkSync(path.join(root, 'docs/project-protocols/exact.md'));
    const missing = resolve(root, target, configuration({ contextGroups: classes }));
    assert.equal(missing.status, 'policy-error');
    assert.ok(missing.reasons.some(r => r.sourceIds.includes('docs/project-protocols/exact.md')));
}));

test('TC-RVP-011 malformed declarations and unresolved references remain policy errors', () => fixture(root => {
    // Given invalid variants at the existing schema boundary.
    const target = freeze(root);
    const variants = [
        [configuration({ reviewGroups: null }), 'reviewGroups'],
        [configuration({ reviewGroups: [{ id: 'first', modules: ['missing'] }] }), 'reviewGroups[0].modules[0]'],
        [configuration({ modules: [{ name: 'area', kind: 'library', pathRegex: 'src' }, { name: 'area', kind: 'library', pathRegex: 'other' }], reviewGroups: [{ id: 'first', modules: ['area'] }] }), 'reviewGroups[0].modules[0]'],
        [configuration({ contextGroups: [{ name: 'area', pathRegexes: [], pathGlobs: ['src/**'] }], reviewGroups: [{ id: 'first', contextGroups: ['area'], priority: 1.5 }] }), 'reviewGroups[0].priority'],
        [configuration({ reviewPreparation: { ruleDocs: ['../outside'] } }), 'reviewPreparation.ruleDocs[0]']
    ];
    // When each invalid policy reaches resolution, then neither defaults nor provider readiness can hide it.
    for (const [cfg, field] of variants) {
        const policy = resolve(root, target, cfg);
        assert.equal(policy.status, 'policy-error');
        assert.ok(policy.reasons.some(reason => reason.code === 'declared-policy-invalid' && reason.sourceIds.includes(field)), JSON.stringify(policy.reasons));
        assert.throws(() => assignPrimaryGroups(target, policy), /not-ready/);
    }
}));

test('TC-RVP-073 explicit empty selection respects independent universal, lessons and index', () => fixture((root, put) => {
    // Given an explicitly empty reference selection with independent project memory/index.
    put('docs/project-reference/lessons.md', 'Fixture lessons'); // Default-root fixture; docs/project-config.json may relocate the project-reference root.
    put('docs/project-reference/docs-index-reference.md', 'Fixture index'); // Default-root fixture; docs/project-config.json may relocate the project-reference root.
    put('docs/project-reference/code-review-rules.md', 'not selected'); // Default-root fixture; docs/project-config.json may relocate the project-reference root.
    const target = freeze(root);
    // When resolved, then project references are exact while independent sources stay required.
    const policy = resolve(root, target, configuration({ framework: { name: 'Fixture framework', codeReviewDoc: 'docs/project-reference/code-review-rules.md' } })); // Default-root fixture; docs/project-config.json may relocate the project-reference root.
    assert.equal(policy.status, 'ready', JSON.stringify(policy.reasons));
    const origins = policy.ruleSources.map(s => s.origin);
    assert.ok(origins.includes('.claude/skills/shared/protocols/fixture-universal.md'));
    assert.ok(origins.includes('docs/project-reference/lessons.md')); // Default-root fixture; docs/project-config.json may relocate the project-reference root.
    assert.ok(origins.includes('docs/project-reference/docs-index-reference.md')); // Default-root fixture; docs/project-config.json may relocate the project-reference root.
    assert.equal(origins.includes('docs/project-reference/code-review-rules.md'), false); // Default-root fixture; docs/project-config.json may relocate the project-reference root.
    assert.ok(policy.ruleSources.every(s => s.authority === 'required' && /^[a-f0-9]{64}$/.test(s.contentHash)));
    put('docs/project-reference/lessons.md', 'changed lessons'); // Default-root fixture; docs/project-config.json may relocate the project-reference root.
    assert.notEqual(resolve(root, target, configuration()).fingerprint, policy.fingerprint);
}));

test('TC-RVP-053 selected Git layers and deleted-before contents own classification', () => fixture((root, put) => {
    // Given a real Git index whose signal differs from the live copy.
    const git = args => execFileSync('git', args, { cwd: root, shell: false, timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
    git(['init']); git(['config', 'user.name', 'Fixture']); git(['config', 'user.email', 'fixture@example.invalid']);
    put('.gitignore', '.claude/\ntmp/\n'); put('src/item.js', 'no marker'); git(['add', '.']); git(['commit', '-m', 'fixture']);
    put('src/item.js', 'signal'); git(['add', 'src/item.js']); put('src/item.js', 'different live copy');
    const cfg = configuration({ contextGroups: [{ name: 'signal-class', pathRegexes: [], contentExtensions: ['.js'], contentRegexes: ['signal'], rules: ['signal review required'] }] });
    // When the staged target is classified, then only its selected before/after bytes are used.
    const staged = captureTarget({ rootDir: root, scope: 'staged', outputDir: 'tmp/staged/frozen' });
    const policy = resolve(root, staged, cfg);
    assert.equal(policy.status, 'ready', JSON.stringify(policy.reasons));
    assert.deepEqual(policy.memberships[staged.entries[0].id].contextGroups, ['signal-class']);
    git(['commit', '-m', 'selected']); git(['rm', '-f', 'src/item.js']);
    const removed = captureTarget({ rootDir: root, scope: 'staged', outputDir: 'tmp/removed/frozen' });
    assert.deepEqual(resolve(root, removed, cfg).memberships[removed.entries[0].id].contextGroups, ['signal-class']);
}));

test('TC-RVP-074 include/type/exclusion semantics and bounded content uncertainty are preserved', () => fixture((root, put) => {
    // Given include and exclusion variants plus bounded content-only evidence.
    put('src/large.js', `${'x'.repeat(20000)}late-signal`); put('src/private.js', 'signal'); put('src/binary.bin', Buffer.from([0, 65]));
    const cfg = configuration({ contextGroups: [
        { name: 'excluded', pathRegexes: [], pathGlobs: ['src/**'], excludePathGlobs: ['src/private.js'], fileExtensions: ['.js'], rules: ['visible rule'] },
        { name: 'content', pathRegexes: [], contentExtensions: ['.js', '.bin'], contentRegexes: ['late-signal'], rules: ['conservative rule'] }
    ] });
    const target = freeze(root, ['src/large.js', 'src/private.js', 'src/binary.bin']);
    // When shared matching encounters unknown content, then no conservative rule is dropped.
    const policy = resolve(root, target, cfg);
    assert.equal(policy.status, 'ready', JSON.stringify(policy.reasons));
    assert.equal(policy.memberships[target.entries[1].id].contextGroups.includes('excluded'), false);
    assert.equal(policy.memberships[target.entries[2].id].contextGroups.includes('excluded'), false);
    for (const entry of [target.entries[0], target.entries[2]]) {
        assert.ok(policy.classificationUnknowns.some(u => u.entryId === entry.id && u.classificationId === 'content'));
        assert.ok(policy.ruleSources.some(s => s.origin === 'context-group:content' && s.entryIds.includes(entry.id)));
    }
}));

test('TC-RVP-074 type/include/exclusion truth table retains both selected movement sides', () => fixture((root, put) => {
    // Given the eight represented type/include/exclusion combinations, with literal membership expectations.
    put('src/allowed.js', 'plain'); put('src/disallowed.txt', 'plain');
    const classes = [];
    for (const include of [false, true]) for (const excluded of [false, true]) classes.push({ name: `matrix-${Number(include)}-${Number(excluded)}`, pathRegexes: [], fileExtensions: ['.js'], pathGlobs: [include ? 'src/**' : 'elsewhere/**'], excludePathGlobs: excluded ? ['src/**'] : [], rules: ['required matrix rule'] });
    const frozen = freeze(root, ['src/allowed.js', 'src/disallowed.txt']);
    // When the actual uncapped matcher classifies the immutable selected content.
    const policy = resolve(root, frozen, configuration({ contextGroups: classes }));
    assert.equal(policy.status, 'ready', JSON.stringify(policy.reasons));
    // Then membership obeys the declared conjunction; no test-side regex/glob matcher substitutes for production.
    for (const [entryIndex, typeAccepted] of [true, false].entries()) for (const include of [false, true]) for (const excluded of [false, true]) {
        const name = `matrix-${Number(include)}-${Number(excluded)}`;
        const expected = typeAccepted && include && !excluded;
        assert.equal(policy.memberships[frozen.entries[entryIndex].id].contextGroups.includes(name), expected, `${typeAccepted}/${include}/${excluded}`);
    }
    // Given a staged movement across extension and directory boundaries.
    const git = args => execFileSync('git', args, { cwd: root, shell: false, timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
    git(['init']); git(['config', 'user.name', 'Fixture']); git(['config', 'user.email', 'fixture@example.invalid']);
    put('.gitignore', '.claude/\ntmp/\n'); git(['add', '.']); git(['commit', '-m', 'fixture']);
    fs.mkdirSync(path.join(root, 'moved')); git(['mv', 'src/allowed.js', 'moved/allowed.txt']);
    const moved = captureTarget({ rootDir: root, scope: 'staged', outputDir: 'tmp/moved/frozen' });
    const sidePolicy = resolve(root, moved, configuration({ contextGroups: [
        { name: 'before-class', pathRegexes: [], fileExtensions: ['.js'], pathGlobs: ['src/**'], rules: ['before-side requirement'] },
        { name: 'after-class', pathRegexes: [], fileExtensions: ['.txt'], pathGlobs: ['moved/**'], rules: ['after-side requirement'] }
    ] }));
    // When each selected side matches a different class, then neither side's rule disappears.
    assert.equal(moved.entries.length, 1); assert.equal(moved.entries[0].status, 'R');
    assert.deepEqual(sidePolicy.memberships[moved.entries[0].id].contextGroups, ['before-class', 'after-class']);
    for (const name of ['before-class', 'after-class']) assert.ok(sidePolicy.ruleSources.some(source => source.origin === `context-group:${name}` && source.entryIds.includes(moved.entries[0].id)));
    // Given unreadable captured content, when content classification cannot establish absence then retain its rule.
    const unreadable = freeze(root, ['src/item.js']);
    fs.unlinkSync(path.join(root, unreadable.entries[0].afterContentRef));
    const uncertain = resolve(root, unreadable, configuration({ contextGroups: [{ name: 'unreadable', pathRegexes: [], contentExtensions: ['.js'], contentRegexes: ['signal'], rules: ['unknown content requirement'] }] }));
    assert.ok(uncertain.classificationUnknowns.some(item => item.entryId === unreadable.entries[0].id && item.classificationId === 'unreadable'));
    assert.ok(uncertain.ruleSources.some(source => source.origin === 'context-group:unreadable' && source.entryIds.includes(unreadable.entries[0].id)));
}));

test('TC-RVP-079 bounded batches conserve each entry and every applicable rule', () => fixture((root, put) => {
    // Given a target larger than one bounded context batch.
    const files = Array.from({ length: 120 }, (_, n) => n % 3 === 0 ? `src/part-${n}.js` : n % 3 === 1 ? `notes/doc-${n}.md` : `other/part-${n}.txt`);
    for (const [index, file] of files.entries()) put(file, 'part'.repeat(index % 5 + 1));
    const target = freeze(root, files);
    const policy = resolve(root, target, configuration({ contextGroups: [
        { name: 'parts', pathRegexes: [], pathGlobs: ['src/**'], rules: ['code part rule'] },
        { name: 'notes', pathRegexes: [], pathGlobs: ['notes/**'], rules: ['note rule'] },
        { name: 'shared', pathRegexes: [], pathGlobs: ['**/*'], rules: ['shared overlapping rule'] }
    ], reviewGroups: [
        { id: 'code', contextGroups: ['parts'], relatedGroups: ['documentation'] },
        { id: 'documentation', contextGroups: ['notes'], relatedGroups: ['code'] }
    ] }));
    const assignments = assignPrimaryGroups(target, policy);
    // When bounded batches are built, then their union is exact and each retains its rule obligations.
    const common = ['accepted-project-policy', '.claude/skills/shared/protocol-groups.json', '.claude/skills/shared/protocols/fixture-universal.md', '.claude/skills/changes-review/SKILL.md', 'context-group:shared'];
    const sources = new Map(policy.ruleSources.map(source => [source.origin, source.id]));
    for (const origin of [...common, 'context-group:parts', 'context-group:notes']) assert.ok(sources.has(origin), origin);
    for (const bounds of [{ maxBatchEntries: 1, maxBatchBytes: 20 }, { maxBatchEntries: 7, maxBatchBytes: 41 }, { maxBatchEntries: 13, maxBatchBytes: 80 }, { maxBatchEntries: 50, maxBatchBytes: 400 }]) {
        const batches = buildReviewBatches(target, policy, assignments, bounds);
        const union = batches.flatMap(batch => batch.entryIds);
        assert.deepEqual(union.slice().sort(), target.entries.map(entry => entry.id).sort());
        assert.equal(new Set(union).size, target.entries.length);
        assert.deepEqual([...new Set(batches.map(batch => batch.groupId))].sort(), ['code', 'documentation', 'general']);
        for (const batch of batches) {
            const entries = batch.entryIds.map(id => target.entries.find(entry => entry.id === id));
            assert.ok(batch.entryIds.length <= bounds.maxBatchEntries);
            assert.ok(entries.reduce((bytes, entry) => bytes + fs.statSync(path.join(root, entry.afterContentRef)).size, 0) <= bounds.maxBatchBytes);
            const expectedOrigins = new Set(common);
            for (const entry of entries) {
                if (entry.path.startsWith('src/')) expectedOrigins.add('context-group:parts');
                if (entry.path.startsWith('notes/')) expectedOrigins.add('context-group:notes');
            }
            assert.deepEqual(batch.ruleSourceIds.slice().sort(), [...expectedOrigins].map(origin => sources.get(origin)).sort());
            assert.deepEqual(batch.relatedGroupIds, batch.groupId === 'code' ? ['documentation'] : batch.groupId === 'documentation' ? ['code'] : []);
        }
    }
    assert.throws(() => buildReviewBatches(target, policy, assignments.slice(1)), /incomplete-assignment/);
    assert.throws(() => buildReviewBatches(target, policy, assignments, { maxBatchBytes: 1 }), /oversized-batch-entry/);
}));

test('TC-RVP-073 unchanged bytes do not preserve policy identity after grouping or reference selection changes', () => fixture((root, put) => {
    // Given overlapping classifiers and unchanged captured work, with a real selectable review source.
    put('docs/project-reference/extra.md', 'Extra required review standard'); // Default-root fixture; docs/project-config.json may relocate the project-reference root.
    const target = freeze(root);
    const classes = [{ name: 'first', pathRegexes: [], pathGlobs: ['src/**'], rules: ['first standard'] }, { name: 'second', pathRegexes: [], pathGlobs: ['**/*.js'], rules: ['second standard'] }];
    const groups = [{ id: 'first', contextGroups: ['first'], priority: 500 }, { id: 'second', contextGroups: ['second'], priority: 500 }];
    const initial = resolve(root, target, configuration({ contextGroups: classes, reviewGroups: groups }));
    // When only priority, declaration order, or reference selection changes.
    const variants = [
        configuration({ contextGroups: classes, reviewGroups: [{ ...groups[0], priority: 501 }, groups[1]] }),
        configuration({ contextGroups: classes, reviewGroups: groups.slice().reverse() }),
        configuration({ contextGroups: classes, reviewGroups: groups, referenceDocs: [{ filename: 'extra.md', purpose: 'Review standards' }] })
    ];
    // Then every policy change invalidates identity while the immutable target fingerprint/bytes stay the same.
    for (const [index, cfg] of variants.entries()) {
        const changed = resolve(root, target, cfg);
        assert.equal(changed.status, 'ready', JSON.stringify(changed.reasons));
        assert.notEqual(changed.fingerprint, initial.fingerprint);
        assert.equal(freeze(root).fingerprint, target.fingerprint);
        if (index < 2) assert.equal(assignPrimaryGroups(target, changed)[0].groupId, 'second');
        else assert.ok(changed.ruleSources.some(source => source.origin === 'docs/project-reference/extra.md')); // Default-root fixture; docs/project-config.json may relocate the project-reference root.
    }
}));

test('TC-RVP-084 absent settings use portable defaults while declared missing rules fail closed', () => fixture((root, put) => {
    // Given a minimal copied framework with no project config.
    const target = freeze(root);
    // When resolved without configuration, then no authoring project docs are fabricated.
    const absent = resolveReviewPolicy({ rootDir: root, target });
    assert.equal(absent.status, 'ready', JSON.stringify(absent.reasons));
    assert.deepEqual(assignPrimaryGroups(target, absent).map(a => a.groupId), ['general']);
    // Given a required declared rule that is unavailable, when resolved then policy blocks.
    const missing = resolve(root, target, configuration({ reviewPreparation: { ruleDocs: ['standards/missing.md'] } }));
    assert.equal(missing.status, 'policy-error');
    put('docs/project-config.json', '{malformed');
    assert.equal(resolveReviewPolicy({ rootDir: root, target }).status, 'policy-error');
}));

const declaration = data => `Fixture dispatcher\n<!-- REVIEW-POLICY-SOURCES:START -->\n\`\`\`json\n${JSON.stringify(data)}\n\`\`\`\n<!-- REVIEW-POLICY-SOURCES:END -->`;
const modes = { version: 1, defaultMode: 'full', modes: { full: ['procedures/full.md'], 'validate-findings': [], 'fix-loop': ['procedures/loop.md', 'procedures/full.md'], same: ['procedures/full.md'], inactive: ['.claude/skills/shared/protocols/optional.md'] } };

test('TC-RVP-012 active procedure bodies enter full inventory while inactive references stay optional', () => fixture((root, put) => {
    // Given source-owned modes, including unavailable inactive references, and a long full procedure body.
    put('.claude/skills/why-review/SKILL.md', declaration(modes));
    const fullBytes = `${'required '.repeat(2000)}end of required procedure`;
    put('procedures/full.md', fullBytes); put('procedures/loop.md', 'Loop required body');
    const target = freeze(root);
    const selected = options => resolveReviewPolicy({ rootDir: root, target, config: configuration(), skillName: 'why-review', ...options });
    // When default full and explicit full resolve, then complete active bytes/hash and identity agree.
    const full = selected({});
    assert.equal(full.status, 'ready', JSON.stringify(full.reasons));
    assert.equal(full.selection.skillMode, 'full');
    const source = full.ruleSources.find(item => item.origin === 'procedures/full.md');
    assert.equal(full.sourceTexts[source.id].toString(), fullBytes);
    assert.equal(source.contentHash, require('../lib/review-target.cjs').digest(fullBytes));
    assert.equal(selected({ skillMode: 'full' }).fingerprint, full.fingerprint);
    assert.equal(full.ruleSources.some(item => item.origin === 'procedures/loop.md' || item.origin.endsWith('/optional.md')), false);
    const loop = selected({ skillMode: 'fix-loop' });
    for (const origin of ['procedures/loop.md', 'procedures/full.md']) assert.ok(loop.ruleSources.some(item => item.origin === origin));
    const terminal = selected({ skillMode: 'validate-findings' });
    assert.equal(terminal.status, 'ready'); assert.deepEqual(terminal.selection.procedureDocs, []);
    assert.equal(terminal.ruleSources.some(item => item.origin.startsWith('procedures/')), false);
    assert.notEqual(selected({ skillMode: 'same' }).fingerprint, full.fingerprint);
    // Then later selected-byte drift changes identity and absence blocks; terminal never reads the absent full body.
    put('procedures/full.md', `${fullBytes} changed`);
    assert.notEqual(selected({}).fingerprint, full.fingerprint);
    fs.unlinkSync(path.join(root, 'procedures/full.md'));
    assert.equal(selected({}).status, 'policy-error');
    assert.equal(selected({ skillMode: 'validate-findings' }).status, 'ready');
}));

test('TC-RVP-073 explicit active source union is canonical, complete and bound to selected identity', () => fixture((root, put) => {
    // Given host-selected project, spec, ADR and caller documents outside keyword-based automatic selection.
    for (const relative of ['references/structure.md', 'contracts/owner.md', 'decisions/accepted.md', 'caller/report-only.md']) put(relative, `Required ${relative}`);
    const target = freeze(root);
    const selected = requiredDocs => resolveReviewPolicy({ rootDir: root, target, config: configuration(), requiredDocs });
    const docs = ['references/structure.md', 'contracts/owner.md', 'decisions/accepted.md', 'caller/report-only.md'];
    // When extras are repeated/reordered, then source identity remains stable and every default survives.
    const full = selected(docs);
    assert.equal(full.status, 'ready', JSON.stringify(full.reasons));
    assert.deepEqual(full.selection.requiredDocs, docs.slice().sort());
    assert.equal(selected([...docs.slice().reverse(), docs[0]]).fingerprint, full.fingerprint);
    for (const origin of [...docs, '.claude/skills/changes-review/SKILL.md', '.claude/skills/shared/protocols/fixture-universal.md']) assert.ok(full.ruleSources.some(source => source.origin === origin));
    assert.notEqual(selected([]).fingerprint, full.fingerprint);
    put('contracts/owner.md', 'Changed selected owner');
    assert.notEqual(selected(docs).fingerprint, full.fingerprint);
    fs.unlinkSync(path.join(root, 'caller/report-only.md'));
    const missing = selected(docs);
    assert.equal(missing.status, 'policy-error');
    assert.ok(missing.reasons.some(item => item.sourceIds.includes('caller/report-only.md')));
}));

test('TC-RVP-081 unknown or malformed mode declarations and active source budgets fail closed', () => fixture((root, put) => {
    // Given an otherwise complete target and malformed, ambiguous, unsafe and oversized metadata variants.
    const { MAX_DECLARATION_BYTES, MAX_DECLARED_MODES, MAX_ACTIVE_DOCUMENTS, MAX_SOURCE_BYTES } = require('../lib/review-rule-policy.cjs');
    const target = freeze(root);
    const selected = options => resolveReviewPolicy({ rootDir: root, target, config: configuration(), skillName: 'why-review', ...options });
    put('procedures/full.md', 'Available full body'); put('procedures/loop.md', 'Available loop body');
    put('.claude/skills/why-review/SKILL.md', declaration(modes));
    assert.equal(selected({}).status, 'ready');
    const invalid = [
        declaration({ ...modes, extra: true }), declaration({ ...modes, version: 2 }), declaration({ ...modes, defaultMode: 'missing' }),
        declaration({ ...modes, modes: { full: null } }), declaration({ ...modes, modes: { full: ['../outside'] } }),
        declaration({ ...modes, modes: { full: ['procedures\\full.md'] } }), declaration({ ...modes, modes: { full: ['/absolute.md'] } }),
        declaration({ ...modes, modes: { full: ['C:/absolute.md'] } }), declaration({ ...modes, modes: { full: ['procedures/./full.md'] } }),
        declaration({ ...modes, modes: { full: Array(MAX_ACTIVE_DOCUMENTS + 1).fill('procedures/full.md') } }),
        declaration({ ...modes, modes: Object.fromEntries(Array.from({ length: MAX_DECLARED_MODES + 1 }, (_, n) => [`mode-${n}`, []])), defaultMode: 'mode-0' }),
        declaration(modes) + '\n<!-- REVIEW-POLICY-SOURCES:START -->',
        '<!-- REVIEW-POLICY-SOURCES:START -->\n```json\n{invalid}\n```\n<!-- REVIEW-POLICY-SOURCES:END -->',
        declaration(modes).replace('```json\n', `\`\`\`json\n${' '.repeat(MAX_DECLARATION_BYTES)}`),
        '<!-- REVIEW-POLICY-SOURCES:END -->\n<!-- REVIEW-POLICY-SOURCES:START -->'
    ];
    // When metadata cannot name one valid bounded procedure, then no ready policy is returned.
    for (const [index, text] of invalid.entries()) {
        put('.claude/skills/why-review/SKILL.md', text);
        assert.equal(selected({}).status, 'policy-error', `declaration ${index}`);
    }
    put('.claude/skills/why-review/SKILL.md', declaration({ version: 1, defaultMode: null, modes: { review: [] } }));
    assert.ok(selected({}).reasons.some(item => item.code === 'review-skill-mode-required'));
    assert.ok(selected({ skillMode: 'unknown' }).reasons.some(item => item.code === 'unknown-review-skill-mode'));
    assert.equal(selected({ skillMode: 'review' }).status, 'ready');
    for (const requiredDocs of [['../escape'], ['folder\\name.md'], Array(MAX_ACTIVE_DOCUMENTS + 1).fill('a.md')]) assert.equal(selected({ skillMode: 'review', requiredDocs }).status, 'policy-error');
    // A combined active union may exceed the bound even when each input independently fits it.
    put('.claude/skills/why-review/SKILL.md', declaration({ version: 1, defaultMode: 'review', modes: { review: ['procedures/active.md'] } }));
    put('procedures/active.md', 'Required active body');
    const union = selected({ requiredDocs: Array.from({ length: MAX_ACTIVE_DOCUMENTS }, (_, n) => `extras/source-${n}.md`) });
    assert.ok(union.reasons.some(item => item.code === 'required-document-budget'));
    put('procedures/large.md', Buffer.alloc(MAX_SOURCE_BYTES + 1, 65));
    const oversized = selected({ skillMode: 'review', requiredDocs: ['procedures/large.md'] });
    assert.equal(oversized.status, 'policy-error');
    assert.ok(oversized.reasons.some(item => item.code === 'required-source-unavailable' && item.sourceIds.includes('procedures/large.md')));
}));
