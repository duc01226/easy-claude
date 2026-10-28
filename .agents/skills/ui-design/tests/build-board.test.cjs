/**
 * Tests for the option-board builder (scripts/build-board.cjs), the page the owner picks from:
 *   - options are numbered 1..N across input files and examples n.k, with a nav entry per option;
 *   - a missing phone capture shows a placeholder, never a broken image;
 *   - every input text is escaped and only http(s) URLs become links (titles come from live pages);
 *   - the page loads no script and no remote resource (CSP);
 *   - a drafts file renders a compare matrix: options in columns (style, layout, draft link), screens in rows;
 *   - invalid input exits 2 and writes nothing.
 * Each case writes into its own temp dir; nothing reads this repository's files.
 *
 * Run: node .claude/skills/ui-design/tests/build-board.test.cjs
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'build-board.cjs');
const { osEssentialsEnv } = require('../../../hooks/tests/lib/os-essentials-env.cjs');

function withDir(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'build-board-'));
  try {
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function writeJson(root, name, value) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value), 'utf8');
  return file;
}

function run(root, args) {
  // OS essentials only (Windows needs its folder variables), with home and temp in the case's own dir.
  const env = osEssentialsEnv({ HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root });
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, env, encoding: 'utf8', timeout: 30000, windowsHide: true });
}

const FAMILY = (name, examples) => ({ id: name.toLowerCase(), kind: 'style-family', name, examples });

test('options from several files are numbered 1..N, examples n.k, each in the nav, with images relative to the board', () => {
  withDir((root) => {
    const slotA = writeJson(root, 'board/a/options.json', [
      FAMILY('Cinematic dark', [{ name: 'Site one', url: 'https://one.example', desktop: 'one@1440.png', phone: 'one@390.png' }]),
      FAMILY('Bento grid', [{ name: 'Site two', desktop: 'two@1440.png' }]),
    ]);
    const slotB = writeJson(root, 'board/b/options.json', [
      {
        id: 'warm', kind: 'layout-archetype', name: 'Split view', fit: { calm: 3, bold: 1 }, examples: [],
        a11yNotes: 'Reading order follows the visual order', reuseAndForks: 'Reuses the card list; forks the header',
      },
    ]);
    const out = path.join(root, 'board.html');
    const result = run(root, [`--out=${out}`, '--title=Bakery board', slotA, slotB]);
    assert.equal(result.status, 0, result.stderr);
    const html = fs.readFileSync(out, 'utf8');
    for (const [number, name] of [[1, 'Cinematic dark'], [2, 'Bento grid'], [3, 'Split view']]) {
      assert.match(html, new RegExp(`<a href="#o${number}">${number}\\. ${name}</a>`));
      assert.match(html, new RegExp(`<section class="option" id="o${number}">`));
    }
    assert.match(html, /<span class="num">1\.1<\/span> Site one/);
    assert.match(html, /src="board\/a\/one%401440\.png"/);
    assert.match(html, /Layout archetype/);
    assert.match(html, /●●●<\/span> calm <span class="sr">3 of 3<\/span>/);
    assert.match(html, /●○○<\/span> bold <span class="sr">1 of 3<\/span>/);
    // And: The accessibility note (VO-6) and the reuse-and-fork note (VO-2) reach the owner.
    assert.match(html, /Accessibility[\s\S]*Reading order follows the visual order/);
    assert.match(html, /Reuses and forks[\s\S]*Reuses the card list; forks the header/);
    // And: A research board is evidence, not a question: its hint points to the compare page.
    assert.match(html, /The evidence behind the options on the compare page/);
    assert.doesNotMatch(html, /Answer with numbers/);
  });
});

test('a missing phone capture shows a placeholder, and a failed capture shows its status', () => {
  withDir((root) => {
    const input = writeJson(root, 'options.json', [FAMILY('Bento grid', [{ name: 'Only desktop', desktop: 'd.png', captureStatus: 'blank' }])]);
    const out = path.join(root, 'board.html');
    assert.equal(run(root, [`--out=${out}`, input]).status, 0);
    const html = fs.readFileSync(out, 'utf8');
    assert.match(html, /<div class="shot missing phone">no phone capture<\/div>/);
    assert.match(html, /capture: blank/);
    assert.doesNotMatch(html, /<img src=""/);
  });
});

test('input text is escaped, only http(s) URLs become links, and the page runs no script', () => {
  withDir((root) => {
    const input = writeJson(root, 'options.json', [FAMILY('<script>alert(1)</script>', [
      { name: '"><img src=x onerror=alert(1)>', url: 'javascript:alert(1)', whatMakesItWow: '<b>bold</b>' },
      { name: 'Safe', url: 'https://safe.example/path?a=1&b=2' },
    ])]);
    const out = path.join(root, 'board.html');
    assert.equal(run(root, [`--out=${out}`, input]).status, 0);
    const html = fs.readFileSync(out, 'utf8');
    assert.doesNotMatch(html, /<script/i);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<img src=x/);
    assert.doesNotMatch(html, /href="javascript:/);
    assert.match(html, /<span class="src">javascript:alert\(1\)<\/span>/);
    assert.match(html, /href="https:\/\/safe\.example\/path\?a=1&amp;b=2" rel="noopener noreferrer"/);
    assert.match(html, /Content-Security-Policy" content="default-src 'none'; img-src 'self' file: data:;/);
  });
});

test('a drafts file renders a compare matrix: options in columns with style and layout, the same screens in rows', () => {
  withDir((root) => {
    const input = writeJson(root, 'drafts/manifest.json', { kind: 'drafts', directions: [
      { id: 'a', name: 'Stage light', style: 'Cinematic dark', layout: 'Giant name hero', note: 'Drama for an MC', href: 'direction-a.html',
        views: [{ name: 'Home', desktop: 'a-home@1440.png', phone: 'a-home@390.png' }] },
      { id: 'b', name: 'Sunlit wall', style: 'Regional modern premium', layout: 'Split hero', href: 'javascript:alert(1)',
        views: [{ name: 'Home', desktop: 'b-home@1440.png' }, { name: 'Booking', phone: 'b-book@390.png' }] },
    ] });
    const out = path.join(root, 'compare.html');
    assert.equal(run(root, [`--out=${out}`, input]).status, 0);
    const html = fs.readFileSync(out, 'utf8');
    // Then: the columns are lettered for "style of B, layout of A" answers and name both axes.
    assert.match(html, /<a href="#d1">A\. Stage light<\/a><a href="#d2">B\. Sunlit wall<\/a>/);
    assert.match(html, /<span class="num">A<\/span> Stage light<\/b>\n<span class="axis">Style: Cinematic dark<\/span><span class="axis">Layout: Giant name hero<\/span>/);
    assert.match(html, /<span class="axis">Layout: Split hero<\/span>/);
    assert.match(html, /style of B, layout of A/);
    // And: one row per screen across every option, with a placeholder where an option lacks one.
    assert.match(html, /<tr><th scope="row">Home<\/th>/);
    assert.match(html, /<tr><th scope="row">Booking<\/th><td><div class="shot missing">no Booking screen<\/div><\/td>/);
    assert.match(html, /src="drafts\/a-home%40390\.png"/);
    assert.match(html, /no phone capture/);
    // And: a local draft link resolves next to the board; a javascript: link is never a link.
    assert.match(html, /<a class="src" href="drafts\/direction-a\.html">Open the clickable draft<\/a>/);
    assert.doesNotMatch(html, /href="javascript:/);
    assert.match(html, /<span class="src">javascript:alert\(1\)<\/span>/);
  });
});

test('an image on another Windows drive links by file URL, and a Windows draft path stays a link', () => {
  const { relativeHref, draftLink } = require(SCRIPT);
  // Given the Windows path rules, wherever the test runs.
  assert.equal(relativeHref('C:\\work\\tmp\\design', 'C:\\work\\tmp\\design\\board\\a@1440.png', path.win32), 'board/a%401440.png');
  assert.equal(relativeHref('C:\\work\\tmp', 'D:\\shots\\a b.png', path.win32), 'file:///D:/shots/a%20b.png');
  assert.match(draftLink('C:\\drafts\\direction-a.html', 'C:\\drafts', 'C:\\drafts', path.win32), /<a class="src" href="direction-a\.html">/);
  assert.match(draftLink('javascript:alert(1)', '/d', '/d'), /<span class="src">/);
});

test('invalid input exits 2 and writes no board', () => {
  withDir((root) => {
    const out = path.join(root, 'board.html');
    const cases = [
      [[`--out=${out}`], /give at least one options or drafts JSON file/],
      [[writeJson(root, 'x.json', [])], /--out=<board\.html> is required/],
      [[`--out=${out}`, writeJson(root, 'bad-kind.json', [{ name: 'A', kind: 'mood', examples: [] }])], /kind must be style-family or layout-archetype/],
      [[`--out=${out}`, writeJson(root, 'no-examples.json', [{ name: 'A', kind: 'style-family' }])], /needs an examples array/],
      [[`--out=${out}`, writeJson(root, 'null-example.json', [{ name: 'A', kind: 'style-family', examples: [null] }])], /example 1 needs a name/],
      [[`--out=${out}`, writeJson(root, 'object.json', { kind: 'other' })], /neither an options array nor/],
      [[`--out=${out}`, '--open'], /unknown argument: --open/],
    ];
    for (const [args, message] of cases) {
      const result = run(root, args);
      assert.equal(result.status, 2, `${args.join(' ')}\n${result.stderr}`);
      assert.match(result.stderr, message);
    }
    assert.equal(fs.existsSync(out), false);
  });
});
