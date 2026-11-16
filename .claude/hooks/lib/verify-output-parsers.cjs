'use strict';

/**
 * Verify output parsers: turn one verify command's captured output into stable failure ITEMS, so a
 * committed baseline can tell a known failure from a new one.
 *
 * An item key names WHAT failed, never where on a line or what the run printed around it: a rule in a
 * file, a test by name, a diagnostic code in a file. Line numbers are left out because an unrelated
 * edit above a known failure would otherwise read as a new failure; repeated failures of one key are
 * counted, so a second occurrence is still new. A diagnostic without a code keys on a short hash of its
 * normalized message. Test names are kept, so every key passes through `scrubText` where it is born:
 * environment values whose names read as secrets, URL credentials and bearer tokens become
 * `[redacted]`, and control characters become spaces. Every later sink (report, receipt, baseline)
 * therefore inherits clean keys.
 *
 * Supported formats, all auto-detected; the items of every format that finds any are combined, so a
 * combined command (a type check and a test runner) reports both:
 *   eslint-json  `eslint --format json`: an array of { filePath, messages[{ ruleId, severity }] }, also
 *                after leading lines such as a package-manager banner
 *   junit-xml    a JUnit report printed to the output: <testcase> with a <failure> or <error> child
 *   tap          TAP `not ok` lines (node --test --test-reporter=tap and other TAP producers)
 *   jest         the default reporter's `● Suite › test` failure headings, keyed with the file of the
 *                `FAIL <path>` line above them; the "Summary of all failing tests" repeat is ignored
 *   pytest       `FAILED path::test` and `ERROR path::test` summary lines
 *   diagnostics  `path:line[:col]: ...` and `path(line,col): ...` lines that carry an error severity
 *                or a code: tsc, mypy, ruff, flake8, pylint, gcc/clang, eslint --format unix
 * Output with none of these yields no items, and the runner falls back to the command-level
 * fingerprint. Every scan is linear in the output size. Adding a format is one parser function plus its
 * entry in PARSERS; a change to how keys are formed raises KEY_VERSION, which marks existing baselines
 * stale instead of misreading them.
 */
const crypto = require('node:crypto');
const path = require('node:path');

const KEY_VERSION = 1;
const MAX_ITEMS = 2000;
const MAX_KEY_LENGTH = 300;
const MAX_LINE_LENGTH = 64 * 1024; // longer lines are not failure headings; skipping them bounds every line scan
const SCRUB_LIMIT = 4 * MAX_KEY_LENGTH;
// eslint-disable-next-line no-control-regex -- the pattern matches terminal escape sequences on purpose
const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g;
// eslint-disable-next-line no-control-regex -- control characters are replaced on purpose
const CONTROL = /[\u0000-\u001f\u007f]+/g;
const SECRET_NAME = /(?:^|_)(?:TOKEN|SECRET|PASSWORD|PASSWD|PASS|API_?KEY|ACCESS_?KEY|PRIVATE_?KEY|CREDENTIALS?|AUTH(?:_TOKEN)?)(?:_|$)/i;

const shortHash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);

function stripAnsi(text) {
    return String(text || '').replace(ANSI, '');
}

/** Values of environment variables whose names read as secrets (8+ characters), longest first. */
function secretValues(env = process.env) {
    return Object.entries(env)
        .filter(([name, value]) => SECRET_NAME.test(name) && typeof value === 'string' && value.length >= 8)
        .map(([, value]) => value)
        .sort((a, b) => b.length - a.length);
}

/**
 * Remove secret values, URL credentials and bearer tokens from a text; replace control characters.
 * Secret values are removed from the whole text first, so a cut can never leave half of one; the
 * pattern scrubs then run on at most SCRUB_LIMIT characters, which keeps them linear in practice.
 */
function scrubText(text, secrets = secretValues()) {
    let value = String(text);
    for (const secret of secrets) value = value.split(secret).join('[redacted]');
    return value
        .slice(0, SCRUB_LIMIT)
        .replace(/(\b[a-z][a-z0-9+.-]*:\/\/)[^/\s:@]+:[^/\s@]+@/gi, '$1[redacted]@')
        .replace(/\b(bearer|token|basic)\s+[A-Za-z0-9._~+/=-]{16,}/gi, '$1 [redacted]')
        .replace(CONTROL, ' ')
        .trim();
}

/** A repository-relative, forward-slash path; a path outside the repository keeps only its base name. */
function relativePath(file, root) {
    let value = String(file || '')
        .trim()
        .replace(/\\/g, '/');
    if (root && (path.isAbsolute(value) || /^[A-Za-z]:\//.test(value))) {
        const relative = path.relative(root, path.resolve(value)).replace(/\\/g, '/');
        value = relative && !relative.startsWith('../') && !path.isAbsolute(relative) ? relative : path.basename(value);
    }
    return value.replace(/^\.\//, '');
}

function boundedKey(key) {
    return key.length <= MAX_KEY_LENGTH ? key : `${key.slice(0, MAX_KEY_LENGTH - 13)}#${shortHash(key)}`;
}

function collector(options) {
    const secrets = options.secrets || secretValues();
    const items = {};
    return {
        items,
        add(key) {
            const clean = boundedKey(scrubText(key, secrets));
            items[clean] = (items[clean] || 0) + 1;
        }
    };
}

function* lines(text) {
    let start = 0;
    while (start <= text.length) {
        let end = text.indexOf('\n', start);
        if (end === -1) end = text.length;
        if (end - start <= MAX_LINE_LENGTH) yield text.slice(start, end).replace(/\r$/, '');
        start = end + 1;
    }
}

/** The eslint JSON report: the whole output, or the part from the first line that starts with `[`. */
function eslintReport(text) {
    const starts = [];
    if (text.trimStart().startsWith('[')) starts.push(text.indexOf('['));
    const afterLine = text.indexOf('\n[');
    if (afterLine !== -1) starts.push(afterLine + 1);
    for (const start of starts) {
        const end = text.lastIndexOf(']');
        if (end <= start) continue;
        try {
            const report = JSON.parse(text.slice(start, end + 1));
            if (Array.isArray(report) && report.every(entry => entry && typeof entry.filePath === 'string' && Array.isArray(entry.messages))) return report;
        } catch {
            /* not the report; try the next start */
        }
    }
    return null;
}

function parseEslintJson(text, options) {
    const report = eslintReport(text);
    if (!report) return null;
    const out = collector(options);
    for (const entry of report) {
        for (const message of entry.messages) {
            if (message?.severity !== 2) continue; // warnings never fail the command
            out.add(`eslint|${relativePath(entry.filePath, options.root)}|${message.ruleId || (message.fatal ? 'parse-error' : 'error')}`);
        }
    }
    return out.items;
}

const XML_ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const xmlText = value => String(value || '').replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => XML_ENTITY[name]);

function xmlAttribute(tag, name) {
    const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(tag);
    return match ? xmlText(match[1] ?? match[2]) : '';
}

/** One forward pass with a cursor: no pattern rescans the text, so hostile XML stays linear. */
function parseJunitXml(text, options) {
    if (!/<testsuites?[\s>]/.test(text) || text.indexOf('<testcase') === -1) return null;
    const out = collector(options);
    let cursor = 0;
    let close = -2; // the next </testcase> at or after the cursor; -1 once none is left (the cursor only moves forward)
    for (;;) {
        const open = text.indexOf('<testcase', cursor);
        if (open === -1) break;
        const tagEnd = text.indexOf('>', open);
        if (tagEnd === -1) break;
        const tag = text.slice(open + '<testcase'.length, tagEnd);
        cursor = tagEnd + 1;
        if (tag.endsWith('/')) continue;
        if (close !== -1 && close < cursor) close = text.indexOf('</testcase>', cursor);
        const next = text.indexOf('<testcase', cursor);
        const bodyEnd = close === -1 || (next !== -1 && next < close) ? next : close;
        const body = text.slice(cursor, bodyEnd === -1 ? text.length : bodyEnd);
        if (/<(?:failure|error)[\s>/]/.test(body)) {
            const name = xmlAttribute(tag, 'name');
            const classname = xmlAttribute(tag, 'classname');
            out.add(`test|${classname ? `${classname}::` : ''}${name || '(unnamed)'}`);
        }
        if (bodyEnd === -1) break;
        cursor = bodyEnd === close ? close + '</testcase>'.length : bodyEnd;
    }
    return out.items;
}

function parseTap(text, options) {
    if (!/^[ \t]*(?:ok|not ok)\b/m.test(text)) return null;
    const out = collector(options);
    for (const line of lines(text)) {
        const match = /^[ \t]*not ok\b(?:[ \t]+\d+)?(?:[ \t]+-)?[ \t]*(.*)$/.exec(line);
        if (!match) continue;
        const description = match[1];
        const directive = description.search(/\s#/); // one character class and a literal: linear
        const comment = directive === -1 ? '' : description.slice(directive);
        if (/^\s#\s*(?:skip|todo)\b/i.test(comment)) continue; // skipped and to-do tests are not failures
        const name = (directive === -1 ? description : description.slice(0, directive)).trim();
        out.add(`test|${name || '(unnamed)'}`);
    }
    return out.items;
}

function parseJest(text, options) {
    if (!/^[ \t]*●[ \t]/m.test(text)) return null;
    const out = collector(options);
    let file = '';
    for (const line of lines(text)) {
        if (/^[ \t]*Summary of all failing tests/.test(line)) break; // jest repeats every failure below it
        const suite = /^[ \t]*(?:FAIL|PASS)[ \t]+(\S+)/.exec(line);
        if (suite) {
            file = relativePath(suite[1], options.root);
            continue;
        }
        const match = /^[ \t]*●[ \t]+(.*\S)/.exec(line);
        if (!match || /^Console\b/.test(match[1])) continue; // "● Console" introduces logged output, not a failure
        // The same heading ("Test suite failed to run", a shared test name) in two files is two failures.
        out.add(`test|${file ? `${file} › ` : ''}${match[1]}`);
    }
    return out.items;
}

function parsePytest(text, options) {
    if (!/^(?:FAILED|ERROR) \S+::/m.test(text)) return null;
    const out = collector(options);
    for (const line of lines(text)) {
        const match = /^(?:FAILED|ERROR) (\S+::\S+)/.exec(line);
        if (match) out.add(`test|${relativePath(match[1], options.root)}`);
    }
    return out.items;
}

// `file:line[:col]: rest` (ruff, flake8, mypy, gcc, eslint unix) or `file(line,col): rest` (tsc, MSBuild).
const DIAGNOSTIC =
    /^(?<file>[^\s:()"'<>|]+\.[A-Za-z0-9]{1,8}|[A-Za-z]:[\\/][^:()"'<>|]+\.[A-Za-z0-9]{1,8})(?:\((?<parenLine>\d+)(?:,\d+)?\)|:(?<line>\d+)(?::\d+)?):\s*(?<rest>.+)$/;

/** The diagnostic's code: TS2304, a ruff/flake8/pylint code, a mypy `[code]`, an eslint `[Error/rule]`. */
function diagnosticCode(rest) {
    const leading = /^(?:(?:error|fatal error)\s+)?([A-Z]{1,4}\d{2,5})\b/.exec(rest);
    if (leading) return leading[1];
    const bracket = /\[(?:Error\/)?([A-Za-z0-9@/_-]+)\]\s*$/.exec(rest);
    if (bracket) return bracket[1];
    return null;
}

function parseDiagnostics(text, options) {
    const out = collector(options);
    let found = false;
    for (const raw of lines(text)) {
        const match = DIAGNOSTIC.exec(raw.trim());
        if (!match) continue;
        const rest = match.groups.rest.trim();
        if (/^(?:warning|note|info|hint)\b/i.test(rest) || /\[Warning\//.test(rest)) continue;
        const code = diagnosticCode(rest);
        if (!code && !/\b(?:error|fatal)\b/i.test(rest)) continue;
        found = true;
        const message = rest.replace(/\d+/g, '#').replace(/\s+/g, ' ').toLowerCase();
        out.add(`diag|${relativePath(match.groups.file, options.root)}|${code || `msg-${shortHash(message)}`}`);
    }
    return found ? out.items : null;
}

const PARSERS = Object.freeze([
    ['eslint-json', parseEslintJson],
    ['junit-xml', parseJunitXml],
    ['tap', parseTap],
    ['jest', parseJest],
    ['pytest', parsePytest],
    ['diagnostics', parseDiagnostics]
]);

/**
 * Failure items for a FAILED command's output: `{ format, items }` with the items of every format that
 * found any (format names joined with `+`), or null when none does (the caller then uses the
 * fingerprint). More than MAX_ITEMS distinct keys also returns null: a list that large is noise.
 */
function extractFailureItems(output, options = {}) {
    const text = stripAnsi(output);
    const parseOptions = { root: options.root, secrets: options.secrets || secretValues() };
    const formats = [];
    const items = {};
    for (const [format, parse] of PARSERS) {
        const found = parse(text, parseOptions);
        if (!found || Object.keys(found).length === 0) continue;
        formats.push(format);
        for (const [key, count] of Object.entries(found)) items[key] = (items[key] || 0) + count;
    }
    if (!formats.length || Object.keys(items).length > MAX_ITEMS) return null;
    return { format: formats.join('+'), items };
}

const TIMING = /\b\d+(?:\.\d+)?\s?(?:ms|msec|s|sec|secs|seconds?|m|min|minutes?)\b/g;
const CLOCK = /\b\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\b/g;
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}(?:[t ][0-9:.]+z?)?\b/g;

/**
 * Command-level fingerprint of a failed run, for output no parser reads. Strict on purpose: only
 * durations, clock times and dates are normalized away, so counts, parameters and repeated lines all
 * count, and any change in the failing lines makes a new fingerprint. The repository root is removed
 * case-insensitively (Windows tools print it in their own case). When no line reads as a failure,
 * every non-empty line is used, so unexplained output never collapses to one constant. Known limit:
 * an improvement also changes the fingerprint; re-freeze it on purpose (`baseline-init --replace`).
 */
function fingerprintOutput(output, exitCode, options = {}) {
    const root = options.root ? String(options.root).replace(/\\/g, '/').toLowerCase() : null;
    const failing = [];
    const all = [];
    for (const raw of lines(stripAnsi(output))) {
        let line = raw.replace(/\\/g, '/').toLowerCase();
        if (root) line = line.split(root).join('<root>');
        line = line.replace(ISO_DATE, '<date>').replace(CLOCK, '<time>').replace(TIMING, '<duration>').replace(/\s+/g, ' ').trim();
        if (!line) continue;
        all.push(line);
        if (/\b(?:error|errors|fail|failed|failure|failures|failing|exception|panic|fatal)\b|[✗✖×]/.test(line)) failing.push(line);
    }
    return crypto
        .createHash('sha256')
        .update(JSON.stringify({ exitCode, lines: (failing.length ? failing : all).sort() }))
        .digest('hex');
}

module.exports = { KEY_VERSION, MAX_ITEMS, PARSERS, extractFailureItems, fingerprintOutput, scrubText, secretValues, stripAnsi, relativePath };
