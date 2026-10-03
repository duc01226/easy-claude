'use strict';

// Intent: project-owned review routing never grants machine authority; declared
// invalid policy is distinct from absence and accepted rescan preserves ownership.
// Pure schema/merge cases use their own objects. Help process cases copy shipped
// owners to an isolated adopter, with no authoring-project configuration or env.
// Windows/macOS/Linux: node/path APIs, literal argv and portable POSIX config paths.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { validateConfig, SCHEMA, describeSchema } = require('../../hooks/lib/project-config-schema.cjs');
const { validateCkConfig, CK_SCHEMA } = require('../../hooks/lib/ck-config-schema.cjs');
const { mergeDetected, fingerprintGroup } = require('../../hooks/lib/convention-merge.cjs');
const { childEnv } = require('../../hooks/tests/lib/hook-runner.cjs');

const frameworkRoot = path.resolve(__dirname, '..', '..');

function project(overrides = {}) {
    return {
        project: { name: 'Fixture application' },
        modules: [{ name: 'server', kind: 'library', pathRegex: '/src/' }],
        contextGroups: [{ name: 'tests', pathRegexes: [], pathGlobs: ['**/*.test.cjs'], rules: ['Verify observable outcomes'] }],
        ...overrides
    };
}

function group(overrides = {}) {
    return { id: 'runtime', modules: ['server'], ...overrides };
}

function invalid(config, field) {
    const result = validateConfig(config);
    assert.equal(result.valid, false, `invalid ${field} was accepted`);
    assert.ok(result.errors.some(error => error.startsWith(field)), result.errors.join('; '));
}

function machine(overrides = {}) {
    return { reviewTools: { openCodeReview: overrides } };
}

test('TechnicalSpec=review-schema-description: compact examples preserve exact authoring shape and guidance', () => {
    // Given independent fixed examples of legacy module fields and review responsibility fields.
    const examples = [
        ['modules', {
            name: '<string> (required)', kind: '<string> (required)', pathRegex: '<regex> (required)',
            description: '<string> (optional)', tags: ['<string> (optional)'], meta: '<object> (optional)'
        }],
        ['reviewGroups', {
            id: '<string> (required)', priority: '<number> (optional)', modules: ['<string> (optional)'],
            contextGroups: ['<string> (optional)'], relatedGroups: ['<string> (optional)'],
            origin: '<detected|user> (optional)', detectedFingerprint: '<string> (optional)'
        }]
    ];
    // When the actual authoring description is generated, retaining the existing compactness limit.
    const described = describeSchema();
    assert.ok(described.split('\n').length < 620, 'complete guidance must remain below the existing context bound');
    for (const [name, expected] of examples) {
        const header = `${name} (array of objects, optional) — each item:`;
        const start = described.indexOf(header);
        assert.ok(start >= 0, `${name} marker missing`);
        const tail = described.slice(start + header.length), end = tail.search(/\n\S/);
        const block = end < 0 ? tail : tail.slice(0, end);
        const json = /\n  \{\n([\s\S]*?)\n  \}/.exec(block);
        assert.ok(json, `${name} example boundaries missing`);
        // Then fixed keys/order/type/requiredness/enum/regex values remain, one complete field per line.
        const actual = JSON.parse(`{\n${json[1]}\n}`);
        assert.deepEqual(actual, expected); assert.deepEqual(Object.keys(actual), Object.keys(expected));
        const lines = json[1].split('\n');
        assert.equal(lines.length, Object.keys(expected).length, `${name} uses exactly one line per field`);
        Object.entries(expected).forEach(([key, value], index) => {
            assert.equal(lines[index], `    ${JSON.stringify(key)}: ${JSON.stringify(value)}${index === lines.length - 1 ? '' : ','}`);
        });
    }
    // Then authoring policy notes and sibling type/enum markers are not sacrificed for whitespace savings.
    assert.match(described, /# Optional deterministic review responsibility groups referencing existing modules and convention classes\./);
    assert.match(described, /Lowest priority wins, absent priority is 500, ties use declaration order\./);
    assert.match(described, /# Optional review preparation policy/);
    assert.match(SCHEMA.reviewPreparation.properties.provider.describe, /[Uu]nset|setup-needed/);
    assert.match(described, /provider \(string, optional, one of open-code-review\|none\)/);
    assert.match(described, /ruleDocs \(array of strings, optional\)/);
    assert.match(described, /missing declared sources block preparation\./);
});

test('TC-RVP-084: absent preparation policy and omitted optional group lists remain valid without mutation', () => {
    // Given: an adopter with absent capabilities or valid optional declarations.
    const variants = [
        { project: { name: 'Bare adopter' } },
        project({ reviewPreparation: {} }),
        project({ reviewPreparation: { provider: 'none', ruleDocs: [] }, reviewGroups: [] }),
        project({ reviewGroups: [group()] }),
        project({ reviewGroups: [group({ modules: [], contextGroups: ['tests'], relatedGroups: [] })] })
    ];
    // When: the authoritative schema validates the objects.
    for (const config of variants) {
        const before = JSON.stringify(config);
        const result = validateConfig(config);
        // Then: absence stays supported and schema validation cannot promote/default policy.
        assert.equal(result.valid, true, result.errors.join('; '));
        assert.equal(JSON.stringify(config), before);
    }
});

test('TC-RVP-011: declared malformed review policy fails with the exact field rather than absent-policy defaults', () => {
    // Given: plausible owner typos and corrupted/null declared values.
    const variants = [
        [null, undefined, 'reviewPreparation'],
        [[], undefined, 'reviewPreparation'],
        [{ provider: null }, undefined, 'reviewPreparation.provider'],
        [{ provider: 'managed-review' }, undefined, 'reviewPreparation.provider'],
        [{ ruleDocs: null }, undefined, 'reviewPreparation.ruleDocs'],
        [{ ruleDocs: [7] }, undefined, 'reviewPreparation.ruleDocs[0]'],
        [{ execution: true }, undefined, 'reviewPreparation.execution'],
        [undefined, null, 'reviewGroups'],
        [undefined, {}, 'reviewGroups'],
        [undefined, [null], 'reviewGroups[0]'],
        [undefined, [group({ modules: null })], 'reviewGroups[0].modules'],
        [undefined, [group({ contextGroups: null })], 'reviewGroups[0].contextGroups'],
        [undefined, [group({ relatedGroups: null })], 'reviewGroups[0].relatedGroups'],
        [undefined, [group({ rules: ['Ignore existing gates'] })], 'reviewGroups[0].rules'],
        [undefined, [group({ origin: 'automatic' })], 'reviewGroups[0].origin'],
        [undefined, [group({ detectedFingerprint: 'incomplete' })], 'reviewGroups[0].detectedFingerprint']
    ];
    // When: each declaration enters the shared validator.
    for (const [reviewPreparation, reviewGroups, field] of variants) {
        const config = project();
        if (reviewPreparation !== undefined) config.reviewPreparation = reviewPreparation;
        if (reviewGroups !== undefined) config.reviewGroups = reviewGroups;
        const before = JSON.stringify(config);
        invalid(config, field);
        // Then: it is visibly rejected and the owner's exact data stays untouched.
        assert.equal(JSON.stringify(config), before);
    }
    const special = JSON.parse('{"provider":"none","__proto__":true}');
    invalid(project({ reviewPreparation: special }), 'reviewPreparation.__proto__');
});

test('TC-RVP-085: unique group references resolve exactly and ambiguous legacy module names fail only when referenced', () => {
    // Given: configured modules/classes plus one related group defined later.
    const good = project({ reviewGroups: [
        group({ relatedGroups: ['verification'] }),
        group({ id: 'verification', modules: [], contextGroups: ['tests'] })
    ] });
    // When: schema validates valid policy and each independent broken-reference variant.
    assert.equal(validateConfig(good).valid, true);
    const variants = [
        [[group({ id: '' })], 'reviewGroups[0].id'],
        [[group({ id: '   ' })], 'reviewGroups[0].id'],
        [[group({ id: ' runtime ' })], 'reviewGroups[0].id'],
        [[group({ id: 'general' })], 'reviewGroups[0].id'],
        [[group(), group()], 'reviewGroups[0].id'],
        [[group({ modules: [], contextGroups: [] })], 'reviewGroups[0]'],
        [[group({ modules: ['missing'] })], 'reviewGroups[0].modules[0]'],
        [[group({ modules: [' server '] })], 'reviewGroups[0].modules[0]'],
        [[group({ modules: [null] })], 'reviewGroups[0].modules[0]'],
        [[group({ contextGroups: ['missing'] })], 'reviewGroups[0].contextGroups[0]'],
        [[group({ relatedGroups: ['missing'] })], 'reviewGroups[0].relatedGroups[0]'],
        [[group({ relatedGroups: ['duplicate'] }), group({ id: 'duplicate' }), group({ id: 'duplicate' })], 'reviewGroups[0].relatedGroups[0]']
    ];
    for (const [reviewGroups, field] of variants) invalid(project({ reviewGroups }), field);
    const ambiguous = project({ modules: [
        { name: 'server', kind: 'library', pathRegex: '/a/' },
        { name: 'server', kind: 'library', pathRegex: '/b/' }
    ] });
    // Then: old unused module duplication is compatible; referencing it is invalid.
    assert.equal(validateConfig(ambiguous).valid, true);
    invalid({ ...ambiguous, reviewGroups: [group()] }, 'reviewGroups[0].modules[0]');
});

test('TC-RVP-085: group identities preserve exact case and Unicode through validation and id-based merging', () => {
    // Given: distinct owner identities with case, Unicode and embedded spaces.
    const entries = [group({ id: 'Runtime', relatedGroups: ['服务组', 'Review Group'] }),
        group(), group({ id: '服务组' }), group({ id: 'Review Group' })];
    // When: schema validation and detection use the accepted exact identities.
    const config = project({ reviewGroups: entries });
    const result = mergeDetected([], entries, { identityKey: 'id' });
    // Then: all four identities stay distinct and references cannot silently fold case.
    assert.equal(validateConfig(config).valid, true);
    assert.deepEqual(result.groups.map(entry => entry.id), entries.map(entry => entry.id));
    assert.deepEqual(result.added, ['Runtime', 'runtime', '服务组', 'Review Group']);
    invalid(project({ reviewGroups: [group({ relatedGroups: ['RUNTIME'] }), group({ id: 'Runtime' })] }), 'reviewGroups[0].relatedGroups[0]');
});

test('TC-RVP-085: absent and every safe whole-number priority are accepted while fractional, null and nonfinite ranks fail', () => {
    // Given: priority boundary representatives, without a schema-owned routing default.
    for (const priority of [undefined, -Number.MAX_SAFE_INTEGER, -1, 0, 100, 500, 900, Number.MAX_SAFE_INTEGER]) {
        const entry = group();
        if (priority !== undefined) entry.priority = priority;
        // When: the schema validates each permitted priority.
        const result = validateConfig(project({ reviewGroups: [entry] }));
        // Then: whole-number ranks remain data; schema does not insert 500.
        assert.equal(result.valid, true, result.errors.join('; '));
        if (priority === undefined) assert.equal(Object.hasOwn(entry, 'priority'), false);
    }
    for (const priority of [null, '100', 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        invalid(project({ reviewGroups: [group({ priority })] }), 'reviewGroups[0].priority');
    }
});

test('TC-RVP-011: additional rule documents reject sensitive and machine paths consistently across supported hosts', () => {
    // Given: portable document references and unsafe owner inputs.
    const validDocs = ['policies/review.md', 'policies/team rules.md', '.claude/docs/development-rules.md'];
    // When: the same schema checks POSIX config paths on Windows, macOS and Linux.
    assert.equal(validateConfig(project({ reviewPreparation: { ruleDocs: validDocs } })).valid, true);
    for (const doc of ['', '../outside.md', '/absolute.md', 'C:/machine/review.md', 'C:\\machine\\review.md',
        'a/../review.md', 'a//review.md', 'a/./review.md', 'CON.md', 'a/review.md ', 'docs/secret.key',
        '.env', 'settings/.env.production', 'credentials/review.md', 'docs/secrets.yaml', 'a\0b.md']) {
        invalid(project({ reviewPreparation: { ruleDocs: [doc] } }), 'reviewPreparation.ruleDocs[0]');
    }
});

test('TC-RVP-078: accepted detection preserves every manual/edited identity, refreshes only unchanged entries and removes nothing', () => {
    // Given: each ownership variant and a no-longer-detected entry.
    for (const origin of [undefined, 'user', 'detected']) {
        for (const edited of [false, true]) {
            const original = group({ priority: 500 });
            const stamped = { ...original, origin, detectedFingerprint: fingerprintGroup(original) };
            if (edited) stamped.priority = 17;
            const obsolete = group({ id: 'obsolete', origin: 'user', modules: ['missing-module'] });
            const current = [stamped, obsolete];
            const proposals = [group({ priority: 100 }), group({ id: 'new-suggestion', contextGroups: ['tests'] })];
            const before = JSON.stringify({ current, proposals });
            // When: the configuration owner merges only its accepted proposals.
            const result = mergeDetected(current, proposals, { identityKey: 'id' });
            // Then: protected entries remain exact; only unedited detected content refreshes.
            const canRefresh = origin === 'detected' && !edited;
            assert.deepEqual(result.groups[0], canRefresh ? {
                ...proposals[0], origin: 'detected', detectedFingerprint: fingerprintGroup(proposals[0])
            } : stamped);
            assert.deepEqual(result.refreshed, canRefresh ? ['runtime'] : []);
            assert.deepEqual(result.kept, canRefresh ? [] : ['runtime']);
            assert.deepEqual(result.groups[1], obsolete);
            assert.deepEqual(result.added, ['new-suggestion']);
            assert.equal(result.groups.length, 3);
            assert.equal(JSON.stringify({ current, proposals }), before);
            assert.equal(validateConfig(project({ reviewGroups: result.groups })).valid, false,
                'preserving an obsolete reference must expose its policy error, not delete it to obtain validity');
        }
    }
});

test('TC-RVP-021: unaccepted proposals stay inert and exact accepted subset alone enters the pure merge', () => {
    // Given: a protected manual group, accepted suggestion and unaccepted standard.
    const original = [group({ origin: 'user' })];
    const accepted = group({ id: 'accepted', contextGroups: ['tests'] });
    const unaccepted = group({ id: 'unaccepted', contextGroups: ['tests'] });
    const before = JSON.stringify(original);
    // When: the owner supplies no accepted entries or one exact accepted entry.
    const preview = mergeDetected(original, [], { identityKey: 'id' });
    const applied = mergeDetected(original, [accepted], { identityKey: 'id' });
    // Then: no acceptance means no policy change, and the unaccepted identity never appears.
    assert.deepEqual(preview.groups, original);
    assert.deepEqual(preview.added, []);
    assert.deepEqual(preview.refreshed, []);
    assert.deepEqual(applied.groups.map(entry => entry.id), ['runtime', 'accepted']);
    assert.ok(!applied.groups.some(entry => entry.id === unaccepted.id));
    assert.equal(JSON.stringify(original), before);
});

test('TC-RVP-031: id-based merge replays stably and keeps missing-fingerprint or edited detected policy protected', () => {
    // Given: unchanged detected policy and incomplete/edited detection metadata.
    const incoming = group();
    const stamped = mergeDetected([], [incoming], { identityKey: 'id' }).groups[0];
    const noFingerprint = { ...incoming, origin: 'detected' };
    const badFingerprint = { ...incoming, origin: 'detected', detectedFingerprint: '0000000000000000' };
    // When: rescan proposes the same or revised content.
    const replay = mergeDetected([stamped], [incoming], { identityKey: 'id' });
    // Then: replay is stable and absent/unproven ownership never permits refresh.
    assert.deepEqual(replay.groups, [stamped]);
    assert.deepEqual(replay.kept, ['runtime']);
    assert.deepEqual(replay.refreshed, []);
    for (const protectedEntry of [noFingerprint, badFingerprint]) {
        assert.deepEqual(mergeDetected([protectedEntry], [group({ priority: 100 })], { identityKey: 'id' }).groups, [protectedEntry]);
    }
});

test('review merge compatibility: legacy name normalization, order and preservation remain unchanged', () => {
    // Given: the existing convention contract uses case-insensitive trimmed names.
    const current = { name: ' Runtime ', pathRegexes: ['/a/'], origin: 'user' };
    const incoming = { name: 'runtime', pathRegexes: ['/b/'] };
    // When: a legacy two-argument caller merges detection.
    const result = mergeDetected([current], [incoming, { name: 'tests', pathRegexes: ['/test/'] }]);
    // Then: the maintained alias is preserved instead of duplicated and additions append.
    assert.deepEqual(result.groups[0], current);
    assert.deepEqual(result.kept, ['runtime']);
    assert.deepEqual(result.added, ['tests']);
    assert.equal(result.groups.length, 2);
    assert.throws(() => mergeDetected([], [], { identityKey: 'path' }), /identityKey/);
});

test('TC-RVP-022: machine schema permits documented denials and rejects null, unknown and malformed authority fields', () => {
    // Given: valid optional preferences with absence, every permission value and native path strings.
    const valid = [ {}, { reviewTools: {} }, machine(), machine({ execution: false, acquisition: 'never', network: false }),
        machine({ execution: true, acquisition: 'auto', network: true }),
        machine({ binaryPath: 'C:\\tools\\opencodereview.exe', cacheDir: 'C:\\private\\review-cache' }),
        machine({ binaryPath: '/tools/opencodereview', cacheDir: '/private/review-cache' }) ];
    // When: machine declarations pass through validateCkConfig (path identity is resolver-owned).
    for (const config of valid) {
        const before = JSON.stringify(config);
        const result = validateCkConfig(config);
        // Then: preferences are validated without granting defaults or rewriting policy.
        assert.equal(result.valid, true, result.errors.join('; '));
        assert.equal(JSON.stringify(config), before);
    }
    const invalidPolicies = [ { reviewTools: null }, { reviewTools: [] }, { reviewTools: { unknown: true } },
        { reviewTools: { openCodeReview: null } }, machine({ execution: null }), machine({ execution: 'true' }),
        machine({ acquisition: null }), machine({ acquisition: 'always' }), machine({ network: null }),
        machine({ network: 1 }), machine({ binaryPath: null }), machine({ binaryPath: '' }),
        machine({ cacheDir: null }), machine({ cacheDir: '   ' }), machine({ binaryPath: '/a\0b' }),
        machine({ install: true }), machine({ modelKey: 'synthetic-sentinel' }),
        JSON.parse('{"reviewTools":{"openCodeReview":{"__proto__":true}}}') ];
    for (const config of invalidPolicies) {
        const result = validateCkConfig(config);
        assert.equal(result.valid, false, JSON.stringify(config));
        assert.ok(result.errors.every(error => error.startsWith('reviewTools')), result.errors.join('; '));
    }
    // Existing warning-only extensibility and optional-null semantics are unaffected elsewhere.
    assert.equal(validateCkConfig({ unrelated: true }).valid, true);
    assert.equal(validateCkConfig({ locale: null }).valid, true);
});

function withHelpFixture(fn) {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'review-config-help-')));
    try {
        const framework = path.join(root, '.claude');
        for (const relative of ['hooks/lib', 'scripts/lib']) {
            fs.cpSync(path.join(frameworkRoot, relative), path.join(framework, relative), { recursive: true });
        }
        for (const relative of ['skills/project-config/scripts/project-config-help.cjs', 'scripts/ck-config-help.cjs',
            'config/README.md', 'docs/configuration/README.md']) {
            const destination = path.join(framework, relative);
            fs.mkdirSync(path.dirname(destination), { recursive: true });
            fs.copyFileSync(path.join(frameworkRoot, relative), destination);
        }
        const overrides = { HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root, CLAUDE_PROJECT_DIR: root };
        for (const key of Object.keys(process.env)) {
            if (/^(?:CK_|CLAUDE_|CODEX_|ANTHROPIC_|OPENAI_|OCR_|OPENCODE_)/i.test(key) && key.toUpperCase() !== 'CLAUDE_PROJECT_DIR') overrides[key] = undefined;
        }
        return fn(framework, root, childEnv(overrides));
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

test('review config discovery: isolated adopter help processes expose every preparation, group and machine option with policy text', () => {
    // Given: a clean framework copy with no authoring-repo config, docs, npm or home policy.
    withHelpFixture((framework, root, env) => {
        const run = relative => {
            const result = spawnSync(process.execPath, [path.join(framework, relative), '--json'], {
                cwd: root, env, encoding: 'utf8', timeout: 60000, shell: false, windowsHide: true
            });
            assert.equal(result.status, 0, `${relative}: ${result.stderr}`);
            return JSON.parse(result.stdout);
        };
        // When: actual project and machine help commands inventory schemas.
        const projectHelp = run('skills/project-config/scripts/project-config-help.cjs');
        const machineHelp = run('scripts/ck-config-help.cjs');
        // Then: the real help consumers expose all nested fields with no duplicated manual registry.
        const allProject = projectHelp.options.flatMap(option => [option, ...option.children]);
        const projectByKey = new Map(allProject.map(option => [option.key, option]));
        const machineByKey = new Map(machineHelp.options.map(option => [option.key, option]));
        for (const key of ['reviewPreparation', ...Object.keys(SCHEMA.reviewPreparation.properties).map(field => `reviewPreparation.${field}`),
            'reviewGroups', ...Object.keys(SCHEMA.reviewGroups.itemSchema).map(field => `reviewGroups[].${field}`)]) {
            assert.ok(projectByKey.get(key)?.describe, `project help missing ${key}`);
        }
        for (const key of ['reviewTools', 'reviewTools.openCodeReview', ...Object.keys(CK_SCHEMA.reviewTools.properties.openCodeReview.properties)
            .map(field => `reviewTools.openCodeReview.${field}`)]) {
            assert.ok(machineByKey.get(key)?.describe, `machine help missing ${key}`);
        }
        assert.match(machineByKey.get('reviewTools').describe, /Committed team configuration grants no/);
        assert.match(projectByKey.get('reviewGroups').describe, /absent priority is 500/);
        assert.match(describeSchema(), /reviewPreparation \(object, optional\)/);
        assert.match(describeSchema(), /reviewGroups \(array of objects, optional\)/);
    });
});
