'use strict';

// Feature-map audit (US-PCI-03, BR-PCI-06): a map linked to specs holds driver facts only,
// a project without specs uses stable FM- ids, and drift between map and specs is reported.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
    auditFeatureMap,
    parseSpec,
    parseFeatureMap,
    normalizeSourcePath,
    configuredSources,
    sourceMatcher,
    listSourceFiles,
    exactPathExists
} = require('../lib/feature-map.cjs');
const { validateConfig } = require('../../hooks/lib/project-config-schema.cjs');

const SCRIPT = path.resolve(__dirname, '..', 'lib', 'feature-map.cjs');
const SPEC_PATH = 'docs/specs/Profile/README.Profile.md';
const STEP_ONE = '1. The member opens the profile editor from the account menu.';

const SPEC = [
    '# Profile — Feature Spec',
    '## 3. User Stories & Acceptance Criteria',
    '### US-PRF-01: Edit the display name',
    'As a member I want to change my display name.',
    '### US-PRF-02: Export account data',
    'As a member I want a copy of my data (no screen of its own).',
    '## 6. Process Flows & Interaction Surface',
    '### 6.4 Key UI States',
    '- Saving shows a busy indicator on US-PRF-02 export too.',
    '### 6.5 Per-Story Interaction Flow',
    '#### US-PRF-01',
    STEP_ONE,
    '2. The member changes the display name and saves; a confirmation appears.',
    '## 7. Permissions & Roles',
    '- US-PRF-03 is mentioned outside §6.5 and is not a UI story.'
].join('\n');

function entry(id, lines) {
    return [`### ${id} · Example`, ...lines].join('\n');
}

const PROFILE_ENTRY = entry('US-PRF-01', [
    `- Spec: \`${SPEC_PATH}\``,
    '- Surface: `web`',
    '- Entry: `/account/profile`',
    '- Fixture/role: seeded member `member-basic` (credential reference only)',
    '- End state: the new display name shows in the page header',
    '- Gotchas: Save stays disabled until a field changes'
]);

function map(...entries) {
    return ['# Feature Map', '', 'Driver facts for each feature.', '', '## Entries', '', ...entries, '', '## Upkeep', '### Not an entry'].join('\n');
}

const kinds = result => result.findings.map(finding => finding.kind).sort();

test('TC-PCI-074 (a): a spec-linked map cites a spec owner and story id and holds no click-path copy', () => {
    const clean = auditFeatureMap({ mapText: map(PROFILE_ENTRY), specs: [{ path: SPEC_PATH, text: SPEC }] });
    assert.equal(clean.mode, 'spec-linked');
    assert.deepEqual(clean.findings, []);
    assert.deepEqual(
        clean.entries.map(item => item.id),
        ['US-PRF-01'],
        'headings outside ## Entries are prose, not entries'
    );

    const copied = auditFeatureMap({
        mapText: map(`${PROFILE_ENTRY}\n- Gotchas: ${STEP_ONE.replace('1. ', '').toUpperCase()}`),
        specs: [{ path: SPEC_PATH, text: SPEC }]
    });
    const finding = copied.findings.find(item => item.kind === 'copied-user-path');
    assert.ok(finding, 'a §6.5 step copied into the map is a finding, whatever its case or list marker');
    assert.match(finding.detail, /Link the spec story instead/);

    const unlinked = auditFeatureMap({
        mapText: map(PROFILE_ENTRY.replace(/^- Spec:.*$/m, '')),
        specs: [{ path: SPEC_PATH, text: SPEC }]
    });
    assert.deepEqual(
        kinds(unlinked),
        ['missing-entry', 'missing-field'],
        'a story entry must name the spec that owns the story; until it does, the story counts as uncovered'
    );
});

test('TC-PCI-075 (b): a project without specs gets stable FM- ids', () => {
    const standalone = map(
        entry('FM-001', ['- Surface: `cli`', '- Entry: `npm run tool -- init`', '- End state: the tool prints the created config path']),
        entry('Profile page', ['- Surface: `web`', '- Entry: `/profile`', '- End state: the page renders'])
    );
    const result = auditFeatureMap({ mapText: standalone, specs: [] });
    assert.equal(result.mode, 'standalone');
    assert.deepEqual(kinds(result), ['invalid-id'], 'an entry without a stable id is rejected; the FM- entry passes');
    assert.match(result.findings[0].detail, /FM-<NNN>/);
    assert.doesNotMatch(result.findings[0].detail, /Profile page/, 'the heading text is never echoed');

    const story = auditFeatureMap({ mapText: map(PROFILE_ENTRY), specs: [] });
    assert.deepEqual(kinds(story), ['stale-spec-id'], 'a story id with no spec behind it is never trusted');
});

test('TC-PCI-076 (c): the audit reports a UI story with no entry and an entry whose story is gone', () => {
    const gone = entry('US-PRF-09', [`- Spec: \`${SPEC_PATH}\``, '- Surface: `web`', '- Entry: `/account/archive`', '- End state: the archive list renders']);
    const result = auditFeatureMap({ mapText: map(gone), specs: [{ path: SPEC_PATH, text: SPEC }] });
    assert.deepEqual(kinds(result), ['missing-entry', 'stale-spec-id']);
    const missing = result.findings.find(item => item.kind === 'missing-entry');
    assert.equal(missing.id, 'US-PRF-01', 'only the story with a §6.5 flow is UI-bearing');
    assert.equal(missing.severity, 'gap');
    assert.equal(result.findings.find(item => item.kind === 'stale-spec-id').severity, 'error');

    const moved = auditFeatureMap({
        mapText: map(PROFILE_ENTRY.replace(SPEC_PATH, 'docs/specs/Profile/README.Old.md')),
        specs: [{ path: SPEC_PATH, text: SPEC }]
    });
    assert.deepEqual(kinds(moved), ['missing-entry', 'stale-spec-id'], 'an entry pointing at a removed spec file is stale');
});

test('TC-PCI-077 (d): the map holds no secret values, and the finding never repeats the value', () => {
    const secret = 'ghp_' + 'A'.repeat(36);
    const result = auditFeatureMap({
        mapText: map(`${PROFILE_ENTRY}\n- Gotchas: log in with token=${secret}`),
        specs: [{ path: SPEC_PATH, text: SPEC }]
    });
    const finding = result.findings.find(item => item.kind === 'secret-value');
    assert.ok(finding, 'a credential-shaped value in the map is a finding');
    assert.ok(!JSON.stringify(result).includes(secret), 'the audit output must not echo the secret');
});

test('feature-map audit: duplicate ids and missing driver facts are reported with the fix', () => {
    const result = auditFeatureMap({
        mapText: map(PROFILE_ENTRY, entry('US-PRF-01', [`- Spec: \`${SPEC_PATH}\``, '- Surface: `web`'])),
        specs: [{ path: SPEC_PATH, text: SPEC }]
    });
    assert.deepEqual(kinds(result), ['duplicate-id', 'missing-field', 'missing-field']);
    assert.match(result.findings.find(item => item.kind === 'duplicate-id').detail, /Merge the two entries/);
});

test('feature-map audit: only §6.5 names UI stories, and short step lines never count as copies', () => {
    const parsed = parseSpec(SPEC);
    assert.deepEqual([...parsed.uiStories], ['US-PRF-01']);
    assert.deepEqual([...parsed.stories].sort(), ['US-PRF-01', 'US-PRF-02']);
    assert.equal(parsed.steps.length, 2);
    const short = parseSpec('### 6.5 Per-Story Interaction Flow\n#### US-A-01\n1. Save.\n');
    assert.deepEqual(short.steps, [], 'a step shorter than the copy threshold is too generic to flag');
});

test('feature-map CLI: exit 0 clean, 1 with findings, NO-MAP when the doc does not exist', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-map-'));
    try {
        const specDir = path.join(root, 'docs', 'specs', 'Profile');
        fs.mkdirSync(specDir, { recursive: true });
        fs.writeFileSync(path.join(specDir, 'README.Profile.md'), SPEC);
        fs.writeFileSync(path.join(specDir, 'INDEX.md'), '### US-PRF-99 derived index, never a story owner\n');
        const mapFile = path.join(root, 'docs', 'project-reference', 'feature-map-reference.md');
        fs.mkdirSync(path.dirname(mapFile), { recursive: true });
        const run = () =>
            spawnSync(process.execPath, [SCRIPT, 'audit', `--root=${root}`, '--map=docs/project-reference/feature-map-reference.md', '--specs=docs/specs'], {
                encoding: 'utf8'
            });

        let out = run();
        assert.equal(out.status, 0, out.stderr);
        assert.equal(JSON.parse(out.stdout).status, 'NO-MAP');

        fs.writeFileSync(mapFile, map(PROFILE_ENTRY));
        out = run();
        assert.equal(out.status, 0, out.stdout);
        assert.equal(JSON.parse(out.stdout).status, 'CLEAN');

        fs.writeFileSync(mapFile, map(PROFILE_ENTRY.replace('US-PRF-01', 'US-PRF-07')));
        out = run();
        assert.equal(out.status, 1);
        assert.deepEqual(
            JSON.parse(out.stdout)
                .findings.map(item => item.kind)
                .sort(),
            ['missing-entry', 'stale-spec-id']
        );

        out = spawnSync(process.execPath, [SCRIPT, 'audit', '--bogus'], { encoding: 'utf8' });
        assert.equal(out.status, 2);
        assert.match(out.stderr, /Unsupported argument/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

// Real spec shapes (review round 1): stories in a table, the flow section numbered 6.6 or as
// a table, steps labelled with their story or chained with arrows.
const TABLE_SPEC = [
    '## 3. User Stories',
    '| ID | Story |',
    '| --- | --- |',
    '| US-TBL-01 | Member exports a report |',
    '## 6. Process Flows & Interaction Surface',
    '### 6.5 Key UI States',
    '- US-TBL-02 is only mentioned in a state list.',
    '### 6.6 Per-Story Interaction Flow',
    '**US-TBL-01 — Export:** open the reports area → choose a month and export → the download starts with the chosen month',
    '| US-TBL-01 | Reports page/export request → month picker → file download confirmation |'
].join('\n');
const TABLE_PATH = 'docs/specs/Reports/README.Reports.md';

test('TC-PCI-076 (c): stories defined in a table and a flow section numbered 6.6 are understood', () => {
    const parsed = parseSpec(TABLE_SPEC);
    assert.deepEqual([...parsed.stories], ['US-TBL-01']);
    assert.deepEqual([...parsed.uiStories], ['US-TBL-01'], 'the flow section is found by its title, not by the number 6.5');
    const gap = auditFeatureMap({ mapText: map(), specs: [{ path: TABLE_PATH, text: TABLE_SPEC }] });
    assert.deepEqual(kinds(gap), ['missing-entry']);
    const linked = entry('US-TBL-01', [
        `- **Spec:** \`${TABLE_PATH}\``,
        '- **Surface:** `web`',
        '- **Entry:** `/reports`',
        '- **End state:** a file downloads'
    ]);
    assert.deepEqual(auditFeatureMap({ mapText: map(linked), specs: [{ path: TABLE_PATH, text: TABLE_SPEC }] }).findings, []);
    const empty = linked.replace('- **Surface:** `web`', '- **Surface:**');
    assert.deepEqual(
        kinds(auditFeatureMap({ mapText: map(empty), specs: [{ path: TABLE_PATH, text: TABLE_SPEC }] })),
        ['missing-field'],
        'an empty bold field is missing'
    );
});

test('TC-PCI-074 (a): a copy of two chained links or a full step is caught', () => {
    const base = [`- Spec: \`${TABLE_PATH}\``, '- Surface: `web`', '- Entry: `/reports`', '- End state: a file downloads'];
    for (const copied of ['- Gotchas: Open the reports area → choose a month and export', '- Gotchas: Month picker -> file download confirmation']) {
        const result = auditFeatureMap({ mapText: map(entry('US-TBL-01', [...base, copied])), specs: [{ path: TABLE_PATH, text: TABLE_SPEC }] });
        assert.deepEqual(kinds(result), ['copied-user-path'], copied);
    }
});

test('TC-PCI-076 (c): per-area docs are audited with the index as one map', () => {
    const area = { path: 'docs/project-reference/feature-map/profile.md', text: `# Profile area\n\n${PROFILE_ENTRY}\n` };
    const index = { path: 'docs/project-reference/feature-map-reference.md', text: '# Feature Map\n\nRead feature-map/profile.md when working on profiles.\n' };
    const clean = auditFeatureMap({ maps: [index, area], specs: [{ path: SPEC_PATH, text: SPEC }] });
    assert.deepEqual(clean.findings, [], 'an entry in an area doc covers its story');
    const duplicate = auditFeatureMap({ maps: [{ ...index, text: map(PROFILE_ENTRY) }, area], specs: [{ path: SPEC_PATH, text: SPEC }] });
    const finding = duplicate.findings.find(item => item.kind === 'duplicate-id');
    assert.ok(finding && finding.file === area.path, 'a duplicate across files names the second file');
});

test('TC-PCI-074 (a): an end state that shares one short flow link with the spec is not a copy', () => {
    const outcome = entry('US-TBL-01', [
        `- Spec: \`${TABLE_PATH}\``,
        '- Surface: `web`',
        '- Entry: `/reports`',
        '- End state: the browser shows a file download confirmation for the chosen month'
    ]);
    assert.deepEqual(auditFeatureMap({ mapText: map(outcome), specs: [{ path: TABLE_PATH, text: TABLE_SPEC }] }).findings, []);
});

test('TC-PCI-076 (c): an area doc without an Entries heading still has every ### heading audited', () => {
    const area = { path: 'docs/project-reference/feature-map/profile.md', text: '# Profile area\n\n' + PROFILE_ENTRY.replace(SPEC_PATH, 'docs/specs/Gone.md') };
    const index = { path: 'docs/project-reference/feature-map-reference.md', text: '# Feature Map\n' };
    const result = auditFeatureMap({ maps: [index, area], specs: [{ path: SPEC_PATH, text: SPEC }] });
    assert.deepEqual(kinds(result), ['missing-entry', 'stale-spec-id']);
    assert.equal(result.findings.find(item => item.kind === 'stale-spec-id').file, area.path);
});

test('TC-PCI-074 (a): a truncated paste of a long flow step is still a copy', () => {
    const longFlow = TABLE_SPEC.replace(
        '| US-TBL-01 | Reports page/export request → month picker → file download confirmation |',
        '**US-TBL-01 — Share:** each exported report arrives in the shared folder once with the same title and month as on screen, naming the workspace'
    );
    const pasted = entry('US-TBL-01', [
        `- Spec: \`${TABLE_PATH}\``,
        '- Surface: `web`',
        '- Entry: `/reports`',
        '- End state: a file downloads',
        '- Gotchas: each exported report arrives in the shared folder once with the same title'
    ]);
    assert.deepEqual(kinds(auditFeatureMap({ mapText: map(pasted), specs: [{ path: TABLE_PATH, text: longFlow }] })), ['copied-user-path']);
    const invalid = auditFeatureMap({ mapText: map(entry('token=abc', ['- Surface: x'])), specs: [] });
    assert.equal(invalid.entries[0].id, null, 'an invalid heading is never echoed in the entry list');
});

// Source audit (opt-in featureMap.sources): every matching source file maps to exactly one entry.
const INDEX_PATH = 'docs/project-reference/feature-map-reference.md';
const ADMIN_DOC = 'docs/project-reference/feature-map/admin.md';
const BILLING_DOC = 'docs/project-reference/feature-map/billing.md';
const USERS_PAGE = 'app/admin/users/page.tsx';
const ROLES_PAGE = 'app/admin/roles/page.tsx';
const INVOICES_PAGE = 'app/billing/invoices/page.tsx';

function sourced(id, source, extra = []) {
    return entry(id, ['- Surface: `web`', '- Entry: `/x`', '- End state: the page renders', `- Source: \`${source}\``, ...extra]);
}
function areaDocs({ admin = [], billing = [] } = {}) {
    return [
        { path: INDEX_PATH, text: '# Feature Map\n\nRead feature-map/admin.md when working on admin pages.\n' },
        { path: ADMIN_DOC, text: `# Admin\n\n${admin.join('\n\n')}\n` },
        { path: BILLING_DOC, text: `# Billing\n\n${billing.join('\n\n')}\n` }
    ];
}
const sourceKinds = result => result.findings.filter(item => /source/.test(item.kind));

test('TC-PCI-087: standalone source audit reports a source with no entry, a gone Source and a shared Source, each with its fix', () => {
    const files = [USERS_PAGE, ROLES_PAGE, INVOICES_PAGE];
    const clean = auditFeatureMap({
        maps: areaDocs({ admin: [sourced('FM-001', USERS_PAGE), sourced('FM-002', ROLES_PAGE)], billing: [sourced('FM-003', INVOICES_PAGE)] }),
        sources: { files }
    });
    assert.equal(clean.mode, 'standalone');
    assert.deepEqual(clean.findings, [], 'one entry per source file is clean');

    // A new page with no entry: a gap that names the doc already holding its neighbours.
    const added = auditFeatureMap({
        maps: areaDocs({ admin: [sourced('FM-001', USERS_PAGE)], billing: [sourced('FM-003', INVOICES_PAGE)] }),
        sources: { files }
    });
    assert.deepEqual(kinds(added), ['missing-source-entry']);
    const gap = added.findings[0];
    assert.equal(gap.severity, 'gap');
    assert.equal(gap.source, ROLES_PAGE);
    assert.match(gap.detail, new RegExp(`Add an FM- entry in ${ADMIN_DOC.replace(/[/.]/g, '\\$&')}`), 'the fix names the area doc of the nearest sibling');
    assert.match(gap.detail, /- Source: `app\/admin\/roles\/page\.tsx`/);

    // A page removed or moved: its entry's Source no longer exists.
    const moved = auditFeatureMap({
        maps: areaDocs({ admin: [sourced('FM-001', USERS_PAGE), sourced('FM-1234', 'app/admin/old/page.tsx')], billing: [sourced('FM-003', INVOICES_PAGE)] }),
        sources: { files: [USERS_PAGE, INVOICES_PAGE] }
    });
    assert.deepEqual(kinds(moved), ['stale-source']);
    assert.equal(moved.findings[0].severity, 'error');
    assert.equal(moved.findings[0].id, 'FM-1234');
    assert.match(moved.findings[0].detail, /remove FM-1234/);

    // Two entries for one page.
    const shared = auditFeatureMap({
        maps: areaDocs({
            admin: [sourced('FM-001', USERS_PAGE), sourced('FM-002', ROLES_PAGE)],
            billing: [sourced('FM-003', INVOICES_PAGE), sourced('FM-004', USERS_PAGE)]
        }),
        sources: { files }
    });
    assert.deepEqual(kinds(shared), ['duplicate-source']);
    assert.equal(shared.findings[0].severity, 'error');
    assert.match(
        shared.findings[0].detail,
        /FM-001 at docs\/project-reference\/feature-map\/admin\.md:\d+, FM-004 at docs\/project-reference\/feature-map\/billing\.md:\d+/
    );
    assert.match(shared.findings[0].detail, /Merge the two entries/);
});

test('TC-PCI-087: strict makes a source with no entry an error; the other rules stay errors', () => {
    const result = auditFeatureMap({
        maps: areaDocs({ admin: [sourced('FM-001', USERS_PAGE), sourced('FM-009', 'app/gone/page.tsx')] }),
        sources: { files: [USERS_PAGE, INVOICES_PAGE], strict: true }
    });
    assert.deepEqual(
        sourceKinds(result).map(item => `${item.kind}:${item.severity}`),
        ['stale-source:error', 'missing-source-entry:error']
    );
    assert.match(
        result.findings.find(item => item.kind === 'missing-source-entry').detail,
        new RegExp(`in ${INDEX_PATH.replace(/[/.]/g, '\\$&')}`),
        'with no sibling, the fix names the index'
    );
});

test('TC-PCI-087: spec-linked mode applies the same three rules to US- and FM- entries', () => {
    const story = entry('US-PRF-01', [
        `- Spec: \`${SPEC_PATH}\``,
        '- Surface: `web`',
        '- Entry: `/account/profile`',
        '- End state: the new display name shows in the page header',
        '- Source: `app/account/profile/page.tsx`'
    ]);
    const specs = [{ path: SPEC_PATH, text: SPEC }];
    const clean = auditFeatureMap({ mapText: map(story), specs, sources: { files: ['app/account/profile/page.tsx'] } });
    assert.equal(clean.mode, 'spec-linked');
    assert.deepEqual(clean.findings, []);

    const drift = auditFeatureMap({
        mapText: map(story, sourced('FM-010', 'app/account/profile/page.tsx'), sourced('FM-011', 'app/removed/page.tsx')),
        specs,
        sources: { files: ['app/account/profile/page.tsx', 'app/account/export/page.tsx'] }
    });
    assert.deepEqual(kinds(drift), ['duplicate-source', 'missing-source-entry', 'stale-source']);
    const gap = drift.findings.find(item => item.kind === 'missing-source-entry');
    assert.equal(gap.severity, 'gap');
    assert.match(gap.detail, /its US- story id, or an FM- id when no story owns it/);
});

test('TC-PCI-088: with no sources configured the audit is unchanged', () => {
    const maps = areaDocs({ admin: [sourced('FM-001', 'app/gone/page.tsx'), sourced('FM-002', 'app/gone/page.tsx')] });
    const off = auditFeatureMap({ maps });
    assert.deepEqual(off.findings, [], 'Source lines are not checked until featureMap.sources is set');
    assert.deepEqual(auditFeatureMap({ maps, sources: null }), off);
    for (const config of [
        {},
        { featureMap: {} },
        { featureMap: { sources: [] } },
        { featureMap: { sources: ['  '] } },
        { featureMap: { sources: ['../x/**'] } }
    ]) {
        assert.equal(configuredSources(config), null, JSON.stringify(config));
    }
    assert.deepEqual(configuredSources({ featureMap: { sources: ['.\\app\\**\\page.tsx'], strict: true } }), { patterns: ['app/**/page.tsx'], strict: true });
});

test('TC-PCI-088: an entry is an FM- or US- heading anywhere in the index, and Source is a recognized field', () => {
    const index = [
        '# Feature Map',
        '## Admin pages',
        '### FM-001 · Users',
        '- Source: `app/admin/users/page.tsx`',
        '- **Surface:** `web`',
        '## Upkeep',
        '### Not an entry',
        '<!--',
        '### FM-999 · commented-out example',
        '-->',
        '## How to write an entry',
        '```markdown',
        '### FM-001 · Example in a fenced block',
        '- Surface: `web`',
        '```',
        '~~~',
        '### FM-998 · Example in a tilde fence',
        '~~~'
    ].join('\n');
    const entries = parseFeatureMap(index);
    assert.deepEqual(
        entries.map(item => item.id),
        ['FM-001'],
        'a stable-id heading outside ## Entries is an entry; prose, comments and fenced examples are not'
    );
    assert.equal(entries[0].fields.source, '`app/admin/users/page.tsx`');
    assert.equal(entries[0].fields.surface, '`web`');
    assert.deepEqual(
        auditFeatureMap({ mapText: index }).findings.filter(item => item.kind !== 'missing-field'),
        [],
        'a fenced example never duplicates a real entry'
    );
    const area = parseFeatureMap('# Area\n\n```\n### FM-500 · example\n```\n\n### FM-501 · Real\n', { area: true });
    assert.deepEqual(
        area.map(item => item.id),
        ['FM-501'],
        'an area doc ignores fenced headings too'
    );
    const example = parseFeatureMap(
        [
            '# Area',
            '',
            '### FM-601 · Real',
            '- Source: `app/real/page.tsx`',
            '',
            '```markdown',
            '### FM-602 · Example',
            '- Source: `app/example/page.tsx`',
            '```'
        ].join('\n'),
        { area: true }
    );
    assert.deepEqual(
        example.map(item => item.id),
        ['FM-601']
    );
    assert.equal(example[0].fields.source, '`app/real/page.tsx`', "a Source line inside a fenced example after an entry is not that entry's Source");
});

test('TC-PCI-089: a listing cut short is reported, never CLEAN, and three entries on one Source are named', () => {
    const maps = areaDocs({ admin: [sourced('FM-001', USERS_PAGE)] });
    const cut = auditFeatureMap({ maps, sources: { files: [USERS_PAGE], truncated: true } });
    assert.deepEqual(
        cut.findings.map(item => `${item.kind}:${item.severity}`),
        ['sources-truncated:gap']
    );
    assert.match(cut.findings[0].detail, /Narrow featureMap\.sources/);
    assert.equal(auditFeatureMap({ maps, sources: { files: [USERS_PAGE], truncated: true, strict: true } }).findings[0].severity, 'error');
    const three = auditFeatureMap({
        maps: areaDocs({ admin: [sourced('FM-001', USERS_PAGE), sourced('FM-002', USERS_PAGE), sourced('FM-003', USERS_PAGE)] }),
        sources: { files: [USERS_PAGE] }
    });
    assert.deepEqual(kinds(three), ['duplicate-source']);
    assert.match(three.findings[0].detail, /FM-001 at .*, FM-002 at .*, FM-003 at .*Merge the 3 entries into one\./);
});

test('TC-PCI-088: the project-config schema accepts featureMap and still accepts a config without it', () => {
    // An existing project's config, written before featureMap existed.
    const oldConfig = {
        schemaVersion: 2,
        project: { name: 'Fixture' },
        referenceDocs: [{ filename: 'feature-map-reference.md', purpose: 'Feature map' }],
        specRoots: { business: { path: 'docs/specs' } }
    };
    const old = validateConfig(oldConfig);
    assert.equal(old.valid, true, old.errors.join('; '));
    assert.ok(!old.warnings.some(item => /featureMap/.test(item)));

    const withSources = validateConfig({ ...oldConfig, featureMap: { sources: ['app/**/page.tsx', 'src/commands/*.ts'], strict: true } });
    assert.equal(withSources.valid, true, withSources.errors.join('; '));
    assert.ok(!withSources.warnings.some(item => /featureMap/.test(item)));

    const invalid = [
        [{ sources: 'app/**/page.tsx' }, /featureMap\.sources: expected array/],
        [{ sources: [42] }, /featureMap\.sources\[0\]: expected string/],
        [{ sources: [''] }, /featureMap\.sources\[0\]: expected a non-empty glob/],
        [{ sources: ['/abs/**/page.tsx'] }, /featureMap\.sources\[0\]: .* relative to the repository root/],
        [{ sources: ['C:\\repo\\page.tsx'] }, /featureMap\.sources\[0\]: .* relative to the repository root/],
        [{ sources: ['app/../x/*.tsx'] }, /no "\.\." segment/],
        [{ sources: ['x'.repeat(301)] }, /longer than 300/],
        [{ sources: Array.from({ length: 65 }, (_, index) => `a${index}/*.ts`) }, /at most 64 globs/],
        [{ sources: ['app/**'], strict: 'yes' }, /featureMap\.strict: expected boolean/],
        [{ source: ['app/**'] }, /featureMap\.source: unknown property/]
    ];
    for (const [featureMap, message] of invalid) {
        const result = validateConfig({ ...oldConfig, featureMap });
        assert.equal(result.valid, false, JSON.stringify(featureMap));
        assert.ok(
            result.errors.some(item => message.test(item)),
            `${JSON.stringify(featureMap)} -> ${result.errors.join('; ')}`
        );
    }
    const strictAlone = validateConfig({ ...oldConfig, featureMap: { strict: true } });
    assert.equal(strictAlone.valid, true);
    assert.ok(strictAlone.warnings.some(item => /featureMap\.strict: has no effect/.test(item)));
});

test('TC-PCI-089: Source paths compare as repository-relative POSIX, whatever separator or prefix was written', () => {
    assert.equal(normalizeSourcePath('app\\admin\\users\\page.tsx'), USERS_PAGE);
    assert.equal(normalizeSourcePath('.\\app\\admin\\users\\page.tsx'), USERS_PAGE);
    assert.equal(normalizeSourcePath('./app//admin/users/page.tsx'), USERS_PAGE);
    assert.equal(normalizeSourcePath('App/Admin/users/page.tsx'), 'App/Admin/users/page.tsx', 'case is kept: it names another path');

    const windowsStyle = auditFeatureMap({
        maps: areaDocs({ admin: [sourced('FM-001', 'app\\admin\\users\\page.tsx'), sourced('FM-002', './app/admin/users/page.tsx')] }),
        sources: { files: ['app\\admin\\users\\page.tsx'] }
    });
    assert.deepEqual(kinds(windowsStyle), ['duplicate-source'], 'two spellings of one path are one Source');

    const absolute = auditFeatureMap({
        maps: areaDocs({ admin: [sourced('FM-001', 'C:\\repo\\app\\page.tsx'), sourced('FM-002', '../outside/page.tsx')] }),
        sources: { files: [] }
    });
    assert.deepEqual(kinds(absolute), ['stale-source', 'stale-source']);
    assert.match(absolute.findings[0].detail, /not a repository-relative path/);

    const matches = sourceMatcher(['app/**/page.tsx']);
    assert.equal(matches('app/page.tsx'), true);
    assert.equal(matches('app\\admin\\users\\page.tsx'), true);
    assert.equal(matches('app/admin/users/Page.tsx'), false, 'matching is case-sensitive on every OS');
    assert.equal(matches('lib/app/page.tsx'), false);
});

test('TC-PCI-089: the source listing is one bounded walk below each glob prefix, and Source existence is exact-case', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-map-sources-'));
    try {
        const write = rel => {
            fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
            fs.writeFileSync(path.join(root, rel), 'export default function Page() {}\n');
        };
        for (const rel of [
            USERS_PAGE,
            ROLES_PAGE,
            'app/admin/users/table.tsx',
            'app/node_modules/pkg/page.tsx',
            'app/.next/server/page.tsx',
            'outside/page.tsx'
        ])
            write(rel);
        const listing = listSourceFiles(root, ['app/**/page.tsx', 'app/admin/*/page.tsx']);
        assert.deepEqual(listing, { files: [ROLES_PAGE, USERS_PAGE], truncated: false }, 'dependency and dot folders are skipped; overlapping globs walk once');
        const bounded = listSourceFiles(root, ['app/**/page.tsx'], { maxEntries: 2 });
        assert.equal(bounded.truncated, true, 'the walk stops at its bound and says so');
        assert.deepEqual(listSourceFiles(root, ['missing/**/page.tsx']), { files: [], truncated: false });
        assert.deepEqual(
            listSourceFiles(root, ['App/**/page.tsx']),
            { files: [], truncated: false },
            'a glob folder spelled differently from the disk lists nothing, also on a case-insensitive filesystem'
        );

        const exists = exactPathExists(root);
        assert.equal(exists(USERS_PAGE), true);
        assert.equal(exists('app/admin/users/Page.tsx'), false, 'a case-insensitive filesystem must not hide a renamed file');
        assert.equal(exists('app/admin/gone/page.tsx'), false);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('TC-PCI-087: the CLI reads featureMap.sources from the project config under --root', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-map-cli-'));
    try {
        const write = (rel, text) => {
            fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
            fs.writeFileSync(path.join(root, rel), text);
        };
        write(USERS_PAGE, 'page\n');
        write(ROLES_PAGE, 'page\n');
        write(INDEX_PATH, '# Feature Map\n');
        write(ADMIN_DOC, `# Admin\n\n${sourced('FM-001', USERS_PAGE)}\n\n${sourced('FM-002', 'app/admin/old/page.tsx')}\n`);
        const config = { schemaVersion: 2, project: { name: 'Fixture' } };
        const writeConfig = extra => write('docs/project-config.json', JSON.stringify({ ...config, ...extra }));
        // A clean machine: no user-level framework settings, temp files inside the fixture.
        const env = { ...process.env, HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root, CLAUDE_PROJECT_DIR: root };
        const run = () =>
            spawnSync(process.execPath, [SCRIPT, 'audit', `--root=${root}`, `--map=${INDEX_PATH}`, '--specs=docs/specs'], { encoding: 'utf8', cwd: root, env });

        writeConfig({});
        let out = run();
        let result = JSON.parse(out.stdout);
        assert.equal(out.status, 0, out.stdout + out.stderr);
        assert.equal(result.sources, undefined, 'an old config without featureMap leaves the audit unchanged');

        writeConfig({ featureMap: { sources: ['app/**/page.tsx'] } });
        out = run();
        result = JSON.parse(out.stdout);
        assert.equal(out.status, 1, out.stderr);
        assert.deepEqual(result.sources, { patterns: ['app/**/page.tsx'], strict: false, files: 2 });
        assert.deepEqual(kinds(result), ['missing-source-entry', 'stale-source']);

        writeConfig({ featureMap: { sources: ['../outside/**'] } });
        out = run();
        result = JSON.parse(out.stdout);
        assert.equal(out.status, 0, 'an invalid config is never trusted');
        assert.match(result.sourcesSkipped, /project config is invalid/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
