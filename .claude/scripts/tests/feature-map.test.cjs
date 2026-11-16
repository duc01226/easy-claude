'use strict';

// Feature-map audit (US-PCI-03, BR-PCI-06): a map linked to specs holds driver facts only,
// a project without specs uses stable FM- ids, and drift between map and specs is reported.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { auditFeatureMap, parseSpec } = require('../lib/feature-map.cjs');

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
