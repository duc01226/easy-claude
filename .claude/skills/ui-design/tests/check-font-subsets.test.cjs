/**
 * Tests for the font script check (scripts/check-font-subsets.cjs), the locale rule of
 * design-knowledge.md §5: a face is "supported" only when the provider lists every required subset.
 *   - a local server stands in for the provider (UI_DESIGN_FONTS_CSS_URL), so no case needs internet;
 *   - covered -> exit 0; a missing subset -> exit 4 naming it; no answer -> NOT VERIFIABLE, exit 3;
 *   - a missing subset wins over NOT VERIFIABLE (the choice is wrong either way);
 *   - a CJK face, served as unnamed unicode-range slices, covers its script only when every probe
 *     character is in range, so a Japanese face never passes as Chinese;
 *   - usage errors exit 2.
 *
 * Run: node .claude/skills/ui-design/tests/check-font-subsets.test.cjs
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'check-font-subsets.cjs');
const { osEssentialsEnv } = require('../../../hooks/tests/lib/os-essentials-env.cjs');

const CSS = {
  'Wide Face': '/* vietnamese */\n@font-face{}\n/* latin-ext */\n@font-face{}\n/* latin */\n@font-face{}',
  'Narrow Face': '/* latin-ext */\n@font-face{}\n/* latin */\n@font-face{}',
  // The CSS2 API shape for a CJK family: numbered slices, no subset name for the CJK ones. This one is
  // shaped like a Japanese face: kana plus the Han characters Japanese uses, none of 们这说 / 們這說.
  'Cjk Face': '/* [118] */\n@font-face{unicode-range: U+3000-303f, U+3041-3096, U+30a0-30ff;}\n/* [119] */\n@font-face{unicode-range: U+4e00-4e3f;}\n/* latin */\n@font-face{unicode-range: U+0000-00ff;}',
  // A full Chinese face: the whole CJK Unified Ideographs block.
  'Han Face': '/* [0] */\n@font-face{unicode-range: U+3100-312f, U+4e00-9fff;}\n/* latin */\n@font-face{unicode-range: U+0000-00ff;}',
};

async function withProvider(fn) {
  const requests = [];
  const server = http.createServer((request, response) => {
    const family = new URL(request.url, 'http://local').searchParams.get('family');
    requests.push({ family, agent: request.headers['user-agent'] });
    if (!CSS[family]) {
      response.writeHead(400);
      response.end();
      return;
    }
    response.writeHead(200, { 'content-type': 'text/css' });
    response.end(CSS[family]);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}/css2`, requests);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// Async: the provider stub runs in this process, so a blocking spawn would deadlock.
function run(args, endpoint) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'font-subsets-'));
  // OS essentials only (Windows needs its folder variables), with home and temp in the case's own dir.
  const env = osEssentialsEnv({ HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root, UI_DESIGN_FONTS_CSS_URL: endpoint || undefined });
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { env, cwd: root, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status) => {
      fs.rmSync(root, { recursive: true, force: true });
      resolve({ status, stdout, stderr });
    });
  });
}

test('a face that lists every required subset is supported (exit 0); the request asks as a modern browser', async () => {
  await withProvider(async (endpoint, requests) => {
    const result = await run(['--subsets=latin,vietnamese', 'Wide Face'], endpoint);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /supported\s+Wide Face/);
    assert.deepEqual(requests.map((request) => request.family), ['Wide Face']);
    assert.match(requests[0].agent, /Chrome\//);
  });
});

test('a face without a required subset exits 4 and names what is missing, even beside an unverifiable one', async () => {
  await withProvider(async (endpoint) => {
    const result = await run(['--subsets=latin,vietnamese', '--json', 'Narrow Face', 'Unknown Face'], endpoint);
    assert.equal(result.status, 4, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.required, ['latin', 'vietnamese']);
    assert.deepEqual(report.results.map((entry) => [entry.family, entry.status, entry.missing]), [
      ['Narrow Face', 'missing', ['vietnamese']],
      ['Unknown Face', 'not-verifiable', []],
    ]);
  });
});

test('a CJK face covers its scripts by unicode range; a Japanese face never passes as Chinese or Korean', async () => {
  await withProvider(async (endpoint) => {
    const covered = await run(['--subsets=latin,japanese', 'Cjk Face'], endpoint);
    assert.equal(covered.status, 0, covered.stdout + covered.stderr);
    // And: a CJK subset passed by ranges is flagged, because ranges cannot tell regional glyph forms apart.
    assert.match(covered.stdout, /code points only for japanese: render a test string/);
    const others = await run(['--subsets=korean,chinese-simplified,chinese-traditional', '--json', 'Cjk Face'], endpoint);
    assert.equal(others.status, 4);
    assert.deepEqual(JSON.parse(others.stdout).results[0].missing, ['korean', 'chinese-simplified', 'chinese-traditional']);
    const han = await run(['--subsets=chinese-simplified,chinese-traditional', 'Han Face'], endpoint);
    assert.equal(han.status, 0, han.stdout + han.stderr);
  });
  // And: the range parser reads single points, spans and ? wildcards.
  const { rangesIn } = require(SCRIPT);
  assert.deepEqual(rangesIn('unicode-range: U+4E2D, U+30??, U+AC00-D7AF;'), [[0x4e2d, 0x4e2d], [0x3000, 0x30ff], [0xac00, 0xd7af]]);
});

test('with no reachable provider every face is NOT VERIFIABLE (exit 3), never supported', async () => {
  const result = await run(['--subsets=latin', 'Wide Face'], 'http://127.0.0.1:9/css2');
  assert.equal(result.status, 3, result.stderr);
  assert.match(result.stdout, /NOT VERIFIABLE\s+Wide Face: NOT VERIFIABLE offline or blocked/);
});

test('usage errors exit 2', async () => {
  for (const [args, message] of [
    [['Wide Face'], /--subsets=<subset,subset> is required/],
    [['--subsets=latin'], /name at least one font family/],
    [['--subsets=latin', 'Bad;Name'], /invalid family name/],
    [['--subsets=Latin Ext', 'Wide Face'], /invalid subset name/],
  ]) {
    const result = await run(args);
    assert.equal(result.status, 2, `${args.join(' ')}: ${result.stderr}`);
    assert.match(result.stderr, message);
  }
});
