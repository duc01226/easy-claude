#!/usr/bin/env node
'use strict';

/**
 * check-font-subsets: does each candidate web font cover the project's scripts (locales)?
 * Reads the subset comments (`/* vietnamese *\/`, `/* cyrillic *\/` ...) that the Google Fonts CSS2
 * API puts above each @font-face block. CJK families are served as many unnamed numbered slices
 * instead, so a CJK subset (japanese, korean, chinese-*) counts as covered only when the declared
 * unicode-ranges cover EVERY probe character of that subset: kana for japanese, Hangul for korean,
 * and characters used only in the simplified, traditional or Hong Kong writing for chinese-*. Ranges
 * cannot tell regional glyph styles apart (the same Han character drawn the Japanese or the Chinese
 * way), so every CJK subset passed this way is listed in `rangeOnly` and noted in the output: render
 * a test string before relying on the face. A family the provider does not serve, or no network, is
 * NOT VERIFIABLE, never "supported". This is the provider's list only: still render a locale test
 * string at display size before relying on a face (design-knowledge.md §5).
 *
 * Usage:
 *   node .claude/skills/ui-design/scripts/check-font-subsets.cjs --subsets=<subset,subset> [--json] "<Family>"...
 *   e.g. --subsets=latin,vietnamese "Playfair Display" "Be Vietnam Pro"
 *
 * UI_DESIGN_FONTS_CSS_URL overrides the CSS2 endpoint (default https://fonts.googleapis.com/css2);
 * the tests point it at a local server.
 *
 * Exit: 0 every family covers every subset; 4 a family lacks a subset (choose another face);
 * 3 at least one family is NOT VERIFIABLE and none lacks a subset; 2 usage error.
 */

const DEFAULT_ENDPOINT = 'https://fonts.googleapis.com/css2';
const ENDPOINT_ENV = 'UI_DESIGN_FONTS_CSS_URL';
const REQUEST_TIMEOUT_MS = 10_000;
// The CSS2 API returns per-subset woff2 blocks (with their subset comments) only to modern browsers.
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const FAMILY_PATTERN = /^[A-Za-z0-9 ]{1,80}$/;
const SUBSET_PATTERN = /^[a-z0-9-]{1,40}$/;
const SUBSET_COMMENT = /\/\*\s*([a-z0-9-]+)\s*\*\//g;
const EXIT = Object.freeze({ OK: 0, USAGE: 2, NOT_VERIFIABLE: 3, MISSING: 4 });
// Probe characters per CJK subset; every one must be covered. A shared character such as 中 would let a
// Japanese or Korean face pass as Chinese, so the Chinese probes are region-specific.
const CJK_PROBES = Object.freeze({
  japanese: [0x3042, 0x30a2], // あ ア
  korean: [0xac00, 0xd55c], // 가 한
  'chinese-simplified': [0x4eec, 0x8fd9, 0x8bf4], // 们 这 说
  'chinese-traditional': [0x5011, 0x9019, 0x8aaa, 0x3105], // 們 這 說 ㄅ (Bopomofo, used in Taiwan)
  'chinese-hongkong': [0x5011, 0x9019, 0x8aaa, 0x5605], // 們 這 說 嘅
});
const UNICODE_RANGE = /unicode-range:\s*([^;}]+)/gi;

class UsageError extends Error {}

function parseArgs(argv) {
  const options = { subsets: null, json: false, families: [] };
  for (const arg of argv) {
    if (arg === '--help') return { help: true };
    if (arg === '--json') { options.json = true; continue; }
    const match = /^--subsets=(.*)$/.exec(arg);
    if (match) {
      options.subsets = match[1].split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
      continue;
    }
    if (arg.startsWith('--')) throw new UsageError(`unknown argument: ${arg}`);
    options.families.push(arg.trim());
  }
  if (!options.subsets || options.subsets.length === 0) throw new UsageError('--subsets=<subset,subset> is required, for example --subsets=latin,vietnamese');
  const badSubset = options.subsets.find((subset) => !SUBSET_PATTERN.test(subset));
  if (badSubset) throw new UsageError(`invalid subset name: ${badSubset}`);
  if (options.families.length === 0) throw new UsageError('name at least one font family');
  const badFamily = options.families.find((family) => !FAMILY_PATTERN.test(family));
  if (badFamily !== undefined) throw new UsageError(`invalid family name: "${badFamily}" (letters, digits and spaces only)`);
  return options;
}

function subsetsIn(css) {
  return [...new Set([...String(css).matchAll(SUBSET_COMMENT)].map((match) => match[1]))];
}

// Every [low, high] code-point range the CSS declares (U+4E2D, U+4E00-4E10, U+30??).
function rangesIn(css) {
  const ranges = [];
  for (const match of String(css).matchAll(UNICODE_RANGE)) {
    for (const part of match[1].split(',')) {
      const token = part.trim().replace(/^u\+/i, '');
      if (!/^[0-9a-f?]+(?:-[0-9a-f]+)?$/i.test(token)) continue;
      const [low, high] = token.split('-');
      if (low.includes('?')) {
        ranges.push([parseInt(low.replace(/\?/g, '0'), 16), parseInt(low.replace(/\?/g, 'f'), 16)]);
      } else {
        ranges.push([parseInt(low, 16), parseInt(high || low, 16)]);
      }
    }
  }
  return ranges;
}

// The required subsets the CSS covers: by its named comments, or for a CJK subset by its ranges.
function coveredSubsets(css, required) {
  const named = subsetsIn(css);
  const ranges = rangesIn(css);
  const covered = new Set(named);
  for (const subset of required) {
    const probes = CJK_PROBES[subset];
    const inRange = (point) => ranges.some(([low, high]) => point >= low && point <= high);
    if (probes && probes.every(inRange)) covered.add(subset);
  }
  return [...covered];
}

async function checkFamily(family, required, endpoint) {
  const url = `${endpoint}?family=${encodeURIComponent(family).replace(/%20/g, '+')}&display=swap`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: { 'user-agent': BROWSER_USER_AGENT }, signal: controller.signal });
    if (!response.ok) {
      return { family, status: 'not-verifiable', reason: `the provider answered HTTP ${response.status} (not served there?)`, supported: [], missing: [] };
    }
    const css = await response.text();
    const supported = coveredSubsets(css, required);
    // CJK subsets passed by code-point ranges, not by a named subset: the glyph forms may be another
    // region's (a Japanese face renders Traditional Chinese text in Japanese forms).
    const named = subsetsIn(css);
    const rangeOnly = required.filter((subset) => CJK_PROBES[subset] && supported.includes(subset) && !named.includes(subset));
    if (supported.length === 0) {
      return { family, status: 'not-verifiable', reason: 'the provider CSS lists no subsets', supported, missing: [] };
    }
    const missing = required.filter((subset) => !supported.includes(subset));
    return { family, status: missing.length ? 'missing' : 'supported', reason: null, supported, missing, rangeOnly };
  } catch (error) {
    const reason = error && error.name === 'AbortError' ? `no answer within ${REQUEST_TIMEOUT_MS} ms` : String(error && error.cause ? error.cause.code || error.cause.message : error.message);
    return { family, status: 'not-verifiable', reason: `NOT VERIFIABLE offline or blocked: ${reason}`, supported: [], missing: [] };
  } finally {
    clearTimeout(timer);
  }
}

async function main(argv = process.argv.slice(2), env = process.env) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    console.error(`Usage error: ${error.message}`);
    return EXIT.USAGE;
  }
  if (options.help) {
    console.log('Usage: node .claude/skills/ui-design/scripts/check-font-subsets.cjs --subsets=<subset,subset> [--json] "<Family>"...');
    return EXIT.OK;
  }
  const endpoint = env[ENDPOINT_ENV] || DEFAULT_ENDPOINT;
  const results = [];
  for (const family of options.families) results.push(await checkFamily(family, options.subsets, endpoint));

  if (options.json) {
    console.log(JSON.stringify({ required: options.subsets, results }, null, 2));
  } else {
    for (const result of results) {
      const note = result.rangeOnly && result.rangeOnly.length
        ? ` (code points only for ${result.rangeOnly.join(', ')}: render a test string to check the regional glyph forms)` : '';
      if (result.status === 'supported') console.log(`supported       ${result.family}${note}`);
      else if (result.status === 'missing') console.log(`missing         ${result.family}: ${result.missing.join(', ')} (has ${result.supported.join(', ')})`);
      else console.log(`NOT VERIFIABLE  ${result.family}: ${result.reason}`);
    }
  }
  if (results.some((result) => result.status === 'missing')) return EXIT.MISSING;
  if (results.some((result) => result.status === 'not-verifiable')) return EXIT.NOT_VERIFIABLE;
  return EXIT.OK;
}

module.exports = { main, parseArgs, subsetsIn, rangesIn, coveredSubsets, EXIT, ENDPOINT_ENV };

if (require.main === module) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(`check-font-subsets error: ${error.message}`);
    process.exitCode = 1;
  });
}
