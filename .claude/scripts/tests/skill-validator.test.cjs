const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// TC-HARNESS-010 / S10: the shipped CLI must detect promised body defects,
// preserve benign skills and report without rewriting structural content.
const script = path.resolve(__dirname, '../../skills/skill-creator/scripts/validate-skills.cjs');
const header = ['---', 'name: fixture', "description: '[Testing] Fixture.'", '---'];
const open = tag => `<!-- SYNC:${tag} -->`;
const close = tag => `<!-- /SYNC:${tag} -->`;
const skill = body => [...header, '## Quick Summary', ...body, ''].join('\n');

function fixture(t, source = fs.readFileSync(script, 'utf8')) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-validator-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const exported = path.join(root, 'skill-creator', 'scripts', 'validate-skills.cjs');
  const scan = path.join(root, 'skills');
  fs.mkdirSync(path.dirname(exported), { recursive: true });
  fs.mkdirSync(scan);
  fs.writeFileSync(exported, source);
  const env = { CLAUDE_PROJECT_DIR: root };
  for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'TEMP', 'TMP']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return {
    root,
    run(content, args = []) {
      const target = path.join(scan, 'SKILL.md');
      fs.writeFileSync(target, content);
      const result = spawnSync(process.execPath, [exported, '--path', scan, ...args], {
        cwd: root, env, encoding: 'utf8', timeout: 10000
      });
      assert.ifError(result.error);
      assert.equal(result.signal, null, result.stderr);
      assert.equal(fs.readFileSync(target, 'utf8'), content, 'structural diagnostics must preserve the file');
      return result;
    }
  };
}

function expectSyncError(result, detail) {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /\[ERROR\].*SYNC/);
  assert.match(result.stdout, detail);
}

test('TC-HARNESS-010: missing Quick Summary warns without failing or rewriting', t => {
  const result = fixture(t).run([...header, '# Fixture', 'Body'].join('\n'), ['--fix']);
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /\[WARN\].*Quick Summary.*first 30 lines/);
  assert.match(result.stdout, /0 errors, 1 warnings/);
  assert.match(result.stdout, /Fixes applied: 0/);
});

test('TC-HARNESS-010: summary location uses physical line30 inclusive, LF and CRLF', t => {
  const f = fixture(t);
  for (const newline of ['\n', '\r\n']) {
    for (const line of [29, 30, 31, 32]) {
      const content = [...header, ...Array(line - 5).fill(''), '## Quick Summary', 'Body'].join(newline);
      const result = f.run(content);
      assert.equal(result.status, 0, result.stdout);
      assert.equal(/\[WARN\].*Quick Summary/.test(result.stdout), line > 30, `line ${line}`);
    }
  }
});

for (const [name, body, detail] of [
  ['unclosed', [open('alpha')], /Unclosed.*alpha.*line 6/],
  ['stray close', [close('alpha')], /Unexpected.*alpha.*line 6/],
  ['mismatched', [open('alpha'), close('beta')], /expected.*alpha.*line 6/],
  ['crossed', [open('alpha'), open('beta'), close('alpha'), close('beta')], /expected.*beta.*line 7/]
]) {
  test(`TC-HARNESS-010: rejects ${name} SYNC fences`, t => {
    expectSyncError(fixture(t).run(skill(body), ['--fix']), detail);
  });
}

test('TC-HARNESS-010: nested and repeated balanced tags are accepted', t => {
  const result = fixture(t).run(skill([open('alpha'), open('alpha'), close('alpha'), close('alpha')]));
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /Total issues: 0/);
});

test('TC-HARNESS-010: full reminder identity is accepted and must match exactly', t => {
  const f = fixture(t);
  const result = f.run(skill([open('alpha'), open('alpha:reminder'), close('alpha:reminder'), close('alpha')]));
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /Total issues: 0/);
  expectSyncError(f.run(skill([open('alpha:reminder'), close('alpha')])), /expected.*alpha:reminder/);
});

test('TC-HARNESS-010: isolated exported CLI has no root package/config/helper dependency', t => {
  const f = fixture(t);
  for (const absent of ['package.json', 'docs', '.claude']) assert.equal(fs.existsSync(path.join(f.root, absent)), false);
  const result = f.run(skill(['Mention `<!-- SYNC:alpha -->` inline.', open('alpha'), close('alpha')]));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /generic defaults/);
  assert.match(result.stdout, /Total issues: 0/);
});

test('TC-HARNESS-010: fenced SYNC examples are prose and lifecycle metadata is accepted', t => {
  const f = fixture(t);
  const content = [
    '---',
    'name: fixture',
    "description: '[Testing] Fixture.'",
    'status: deprecated',
    'deprecated_by: replacement-skill',
    'deprecated_since: 2026-01-02',
    'removal_after: 2027-01-02',
    '---',
    '## Quick Summary',
    '```markdown',
    '<!-- SYNC:{new-block-name} -->',
    '<!-- /SYNC:{new-block-name} -->',
    '```',
    ''
  ].join('\n');
  const result = f.run(content);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Total issues: \d+ \(0 errors, 0 warnings, \d+ info\)/);
});

test('TC-HARNESS-010: malformed lifecycle metadata fails closed', t => {
  const f = fixture(t);
  const base = ['---', 'name: fixture', "description: '[Testing] Fixture.'"];
  const cases = [
    [['status: retired'], /Unknown lifecycle status/],
    [['status: deprecated'], /must name a replacement/],
    [['status: deprecated', 'deprecated_by: replacement-skill', 'deprecated_since: 2026'], /must use ISO date/],
    [['status: deprecated', 'deprecated_by: replacement-skill', 'deprecated_since: 2027-01-02', 'removal_after: 2026-01-02'], /must not precede/],
    [['status: active', 'deprecated_by: replacement-skill'], /require status: deprecated/],
  ];
  for (const [fields, detail] of cases) {
    const result = f.run([...base, ...fields, '---', '## Quick Summary', 'Body'].join('\n'));
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /\[ERROR\]/);
    assert.match(result.stdout, detail);
  }
});

function lifecycleDate(field, value) {
  return [...header.slice(0, -1), 'status: deprecated', 'deprecated_by: replacement-skill',
    `${field}: ${value}`, '---', '## Quick Summary', 'Body'].join('\n');
}

function expectCalendarError(result, field) {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.ok(result.stdout.includes(`Lifecycle field "${field}" must use ISO date YYYY-MM-DD`), result.stdout);
  assert.match(result.stdout, /1 errors, 0 warnings/);
}

test('TC-HARNESS-010: lifecycle dates reject impossible days without rewriting or granting removal', t => {
  // Invariant: author typos cannot silently normalize the earliest GC date.
  const f = fixture(t);
  for (const field of ['deprecated_since', 'removal_after']) {
    for (const value of ['2026-02-30', '2026-02-29', '1900-02-29', '2026-04-31',
      '2026-00-10', '2026-13-10', '2026-01-00', '2026-01-32', '2026-2-01']) {
      const result = f.run(lifecycleDate(field, value), ['--fix']);
      expectCalendarError(result, field);
      assert.match(result.stdout, /Fixes applied: 0/);
    }
    for (const value of ['2024-02-29', '2000-02-29', '2026-02-28', '2026-04-30', '2026-12-31']) {
      const result = f.run(lifecycleDate(field, value), ['--fix']);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /0 errors, 0 warnings/);
      assert.match(result.stdout, /Fixes applied: 0/);
    }
  }
});

function expectBenignBody(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Total issues: 0/);
}

test('TC-HARNESS-010: unmatched fenced examples are ignored but identical live tags fail', t => {
  // Invariant: example text is data, while a closed fence restores live validation.
  const f = fixture(t);
  for (const marker of ['`', '~']) {
    for (const length of [3, 5]) {
      for (const indent of ['', '   ']) {
        const start = indent + marker.repeat(length) + 'markdown';
        const end = indent + marker.repeat(length);
        for (const [tag, detail] of [[open('example'), /Unclosed.*example/], [close('example'), /Unexpected.*example/]]) {
          expectBenignBody(f.run(skill([start, tag, end]), ['--fix']));
          expectSyncError(f.run(skill([tag]), ['--fix']), detail);
          expectSyncError(f.run(skill([start, tag, end, open('live')])), /Unclosed.*live/);
        }
        if (length > 3) {
          // Neither a shorter delimiter nor the other marker closes the sample.
          const other = marker === '`' ? '~' : '`';
          expectBenignBody(f.run(skill([start, marker.repeat(3), open('short'), other.repeat(length), close('other'), end])));
        }
      }
    }
  }
});

test('TC-HARNESS-010: removing fenced-content exclusion is killed by the preservation oracle', t => {
  const source = fs.readFileSync(script, 'utf8');
  const anchor = 'if (fence) continue;';
  assert.equal(source.split(anchor).length, 2, 'one real mutation site');
  const mutant = source.replace(anchor, 'if (false) continue;');
  const result = fixture(t, mutant).run(skill(['```markdown', open('example'), '```']));
  expectSyncError(result, /Unclosed.*example/);
  assert.throws(() => expectBenignBody(result), { code: 'ERR_ASSERTION' });
});

test('TC-HARNESS-010: shape-only calendar mutant is killed by the invalid-day oracle', t => {
  const source = fs.readFileSync(script, 'utf8');
  const anchor = 'if (value && !isIsoCalendarDate(value)) {';
  assert.equal(source.split(anchor).length, 2, 'one real mutation site');
  const mutant = source.replace(anchor, 'if (value && !ISO_DATE.test(value)) {');
  const result = fixture(t, mutant).run(lifecycleDate('removal_after', '2026-02-30'));
  assert.equal(result.status, 0, 'the mutation must run and accept the impossible date');
  assert.throws(() => expectCalendarError(result, 'removal_after'), { code: 'ERR_ASSERTION' });
});

test('TC-HARNESS-010: calendar validation handles invalid Date values and normalization separately', t => {
  const source = fs.readFileSync(script, 'utf8');
  for (const [anchor, replacement, value] of [
    ['Number.isFinite(date.getTime()) && ', '', '2026-13-01'],
    ['date.toISOString().slice(0, 10) === value', 'true', '2026-02-30']
  ]) {
    assert.equal(source.split(anchor).length, 2, 'one real calendar mutation site');
    const result = fixture(t, source.replace(anchor, replacement)).run(lifecycleDate('removal_after', value));
    if (value === '2026-13-01') assert.match(result.stderr, /RangeError: Invalid time value/);
    else assert.equal(result.status, 0, 'round-trip deletion must actually accept normalization');
    assert.throws(() => expectCalendarError(result, 'removal_after'), { code: 'ERR_ASSERTION' });
  }
});

test('TC-HARNESS-010: only valid lifecycle dates participate in chronological ordering', t => {
  const f = fixture(t);
  for (const [since, removal, field] of [
    ['2026-13-01', '2026-01-01', 'deprecated_since'],
    ['2026-01-01', '2026-00-01', 'removal_after']
  ]) {
    const content = lifecycleDate('deprecated_since', since).replace('---\n## Quick Summary', `removal_after: ${removal}\n---\n## Quick Summary`);
    const result = f.run(content);
    expectCalendarError(result, field);
    assert.doesNotMatch(result.stdout, /must not precede/);
  }
  for (const removal of ['2026-01-01', '2026-01-02']) {
    const content = lifecycleDate('deprecated_since', '2026-01-01').replace('---\n## Quick Summary', `removal_after: ${removal}\n---\n## Quick Summary`);
    const result = f.run(content);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /0 errors, 0 warnings/);
  }
});

test('TC-HARNESS-010: default scan excludes the template-skill source', t => {
  const f = fixture(t);
  const templateDir = path.join(f.root, 'skills', '_templates', 'template-skill');
  fs.mkdirSync(templateDir, { recursive: true });
  fs.writeFileSync(path.join(templateDir, 'SKILL.md'), [
    '---',
    'name: invalid TEMPLATE',
    '---',
    '# template source'
  ].join('\n'));
  const result = f.run(skill([]));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Found 1 SKILL\.md files/);
  assert.doesNotMatch(result.stdout, /template-skill/);
});

test('TC-HARNESS-010: --fix refuses a scan path outside the project root', t => {
  const f = fixture(t);
  const outside = fs.mkdtempSync(path.join(path.dirname(f.root), 'skill-validator-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const target = path.join(outside, 'SKILL.md');
  const content = [...header, 'name: invalid duplicate'].join('\n');
  fs.writeFileSync(target, content);
  const exported = path.join(f.root, 'skill-creator', 'scripts', 'validate-skills.cjs');
  const result = spawnSync(process.execPath, [exported, '--path', outside, '--fix'], {
    cwd: f.root, env: f.env || { CLAUDE_PROJECT_DIR: f.root }, encoding: 'utf8', timeout: 10000
  });
  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stderr, /outside project root/);
  assert.equal(fs.readFileSync(target, 'utf8'), content, 'external target must remain untouched');
});

test('TC-HARNESS-010: malformed frontmatter still fails', t => {
  const result = fixture(t).run('---\nname: fixture\n## Quick Summary\nBody');
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /\[ERROR\] No YAML frontmatter found/);
});

test('TC-HARNESS-010: bounded nesting property and boundary counter-cases', t => {
  // Finite domain: depths1..4, two tag families, LF/CRLF; deleting a close,
  // renaming the innermost close, or prepending a close must fail. Not a universal proof.
  const f = fixture(t);
  for (const base of ['alpha', 'alpha:reminder']) {
    for (const depth of [1, 2, 3, 4]) {
      const tags = Array.from({ length: depth }, (_, i) => `${base}-${i}`);
      const starts = tags.map(open);
      const ends = tags.slice().reverse().map(close);
      for (const newline of ['\n', '\r\n']) {
        const valid = skill([...starts, ...ends]).replaceAll('\n', newline);
        assert.equal(f.run(valid).status, 0, `valid ${base}/${depth}/${JSON.stringify(newline)}`);
        for (const body of [[...starts, ...ends.slice(1)], [...starts, close('different'), ...ends.slice(1)], [close('stray'), ...starts, ...ends]]) {
          expectSyncError(f.run(skill(body).replaceAll('\n', newline)), /SYNC/);
        }
      }
    }
  }
});

test('TC-HARNESS-010: ignored-body semantic mutant is killed by the defect oracle', t => {
  const source = fs.readFileSync(script, 'utf8');
  // Remove only the body-validation call in an isolated copy; schema/CLI remain live.
  const mutant = source.replace('validateBody(fm, result);', '/* seeded mutant: body ignored */');
  assert.notEqual(mutant, source, 'mutation site must exist');
  const result = fixture(t, mutant).run(skill([open('alpha')]));
  assert.equal(result.status, 0, 'mutant must actually skip body rejection');
  assert.throws(() => expectSyncError(result, /Unclosed/), { code: 'ERR_ASSERTION' });
});
