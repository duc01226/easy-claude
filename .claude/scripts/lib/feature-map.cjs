'use strict';

/**
 * Feature-map audit: the deterministic check behind `feature-map-reference.md`.
 *
 * The map answers "where is X and how do I drive it?". Canonical specs already own a
 * feature's vocabulary and its user-POV click path (§6.5 Per-Story Interaction Flow), so
 * in a project with specs each entry keys on a spec story id (`US-<CODE>-<NN>`) and holds
 * only the driver facts a spec may not carry: surface id, entry URL or command, fixture
 * or role, observable end state and gotchas. A project without specs uses stable
 * `FM-<NNN>` ids instead. This module reads the map and the specs and reports drift; it
 * never writes either file.
 *
 * Entry format (one per `###` heading under the map's `## Entries` heading):
 *
 *   ### US-PCI-03 · Short name            (or: ### FM-001 · Short name)
 *   - Spec: `<spec root>/<Area>/README.<Feature>.md`   (US- entries only)
 *   - Surface: `web`
 *   - Entry: `/settings/profile` or `npm run cli -- init`
 *   - Fixture/role: seeded admin account (a credential reference, never a value)
 *   - End state: what the driver observes when the flow worked
 *   - Gotchas: optional driving notes
 *
 * CLI: node .claude/scripts/lib/feature-map.cjs audit [--map=<file>] [--specs=<dir>]
 * JSON on stdout. Exit 0 = no findings, 1 = findings, 2 = usage or read error.
 */

const fs = require('node:fs');
const path = require('node:path');
const { findSecretLines } = require('../../hooks/lib/knowledge-pack.cjs');

const MAP_FILENAME = 'feature-map-reference.md';
const STORY_ID = /^US-[A-Z][A-Z0-9]*-\d+$/;
const STANDALONE_ID = /^FM-\d{3,}$/;
const ENTRY_HEADING = /^###\s+(\S+)/;
// `- Surface: web`, `- **Surface:** web` and `- **Surface**: web` all name the same field.
const FIELD_LINE = /^\s*[-*]\s+\*{0,2}(Spec|Surface|Entry|Fixture\/role|End state|Gotchas)\*{0,2}\s*:\*{0,2}\s*(.*)$/i;
const REQUIRED_FIELDS = Object.freeze(['surface', 'entry', 'end state']);
const MIN_COPIED_STEP_CHARS = 24;
// One link of a flow chain is often a short outcome a driver also writes as an end state
// ("work with context retained"); only a full sentence-sized step or two consecutive links
// are specific enough to prove a copy.
const MIN_STANDALONE_STEP_WORDS = 6;
// A truncated paste of a long step: this many consecutive words shared with one flow link.
const COPIED_RUN_WORDS = 8;

/** Every run of COPIED_RUN_WORDS consecutive words in a normalized text. */
function wordRuns(text) {
    const words = text.split(' ').filter(Boolean);
    const runs = [];
    for (let index = 0; index + COPIED_RUN_WORDS <= words.length; index += 1) runs.push(words.slice(index, index + COPIED_RUN_WORDS).join(' '));
    return runs;
}
const MAX_SPEC_FILES = 2000;
const STORY_IN_TEXT = /\bUS-[A-Z][A-Z0-9]*-\d+\b/g;
// The strict-default spec names this section "Per-Story Interaction Flow"; its number varies (6.5, 6.6).
const FLOW_HEADING = /interaction\s+flow/i;

/**
 * Collapse a prose line to a comparable form: no list marker, leading story label, emphasis,
 * case or extra space, so a copy is found however it was re-formatted.
 */
function normalizeStep(line) {
    return (
        String(line)
            .replace(/^\s*(?:\d+[.)]|[-*+])\s+/, '')
            .replace(/[*_`]/g, '')
            .replace(/^\s*US-[A-Z][A-Z0-9]*-\d+\s*[:.—–-]\s*/i, '')
            // A short leading label ("Export:", a map field name) is not part of the step.
            .replace(/^\s*[^:→]{1,40}:\s+/, '')
            .replace(/\s*(?:->|⇒|→)\s*/g, ' → ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase()
    );
}

/** Cells of a Markdown table row, or null for a non-row or a separator row. */
function tableCells(line) {
    if (!/^\s*\|/.test(line) || /^\s*\|[\s:|-]+\|?\s*$/.test(line)) return null;
    return line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map(cell => cell.trim());
}

function headingLevel(line) {
    const match = /^(#{1,6})\s/.exec(line);
    return match ? match[1].length : 0;
}

/**
 * Read one spec: the stories it defines (a `### US-…` heading, or a table row whose first
 * cell is the story id), the stories its Per-Story Interaction Flow names (the UI-bearing
 * ones), and that section's steps (list items and table cells).
 */
function parseSpec(text) {
    const lines = String(text).replace(/\r\n/g, '\n').split('\n');
    const stories = new Set();
    const uiStories = new Set();
    const steps = [];
    const runs = new Set();
    // A flow line is often a chain ("open deck → next slide → print"). A copy is caught as a
    // sentence-sized step or as two consecutive links, never as one short link.
    const addStep = value => {
        const links = normalizeStep(value)
            .split(' → ')
            .map(link => link.replace(/[.;]$/, '').trim())
            .filter(Boolean);
        for (const link of links) {
            for (const run of wordRuns(link)) runs.add(run);
            for (const sentence of link.split(/(?<=[.;])\s+/)) {
                const step = sentence.replace(/[.;]$/, '');
                if (step.length >= MIN_COPIED_STEP_CHARS && step.split(' ').length >= MIN_STANDALONE_STEP_WORDS) steps.push(step);
            }
        }
        for (let index = 0; index + 1 < links.length; index += 1) {
            const pair = `${links[index]} → ${links[index + 1]}`;
            if (pair.length >= MIN_COPIED_STEP_CHARS) steps.push(pair);
        }
    };
    let flowLevel = 0;
    for (const line of lines) {
        const level = headingLevel(line);
        if (level) {
            if (flowLevel && level <= flowLevel) flowLevel = 0;
            if (!flowLevel && FLOW_HEADING.test(line)) {
                flowLevel = level;
                continue;
            }
        }
        const cells = tableCells(line);
        if (!flowLevel) {
            const defined = level ? /^#{2,6}\s+(US-[A-Z][A-Z0-9]*-\d+)\b/.exec(line) : cells && /^\*{0,2}(US-[A-Z][A-Z0-9]*-\d+)\b/.exec(cells[0]);
            if (defined) stories.add(defined[1]);
            continue;
        }
        for (const id of line.match(STORY_IN_TEXT) || []) uiStories.add(id);
        if (level) continue;
        if (cells) cells.forEach(addStep);
        else if (line.trim() && !/^\s*(?:---+|```)/.test(line)) addStep(line);
    }
    return { stories, uiStories, steps, runs };
}

/**
 * Split the map into entries. In the index, headings outside `## Entries` are prose; a per-area
 * doc (`{ area: true }`) is all entries, so every `###` heading in it is one.
 */
function parseFeatureMap(text, { area = false } = {}) {
    // Commented-out examples (the template ships one) are not entries; keep line numbers.
    const lines = String(text)
        .replace(/\r\n/g, '\n')
        .replace(/<!--[\s\S]*?-->/g, comment => comment.replace(/[^\n]/g, ''))
        .split('\n');
    const entries = [];
    let inEntries = area;
    let current = null;
    lines.forEach((line, index) => {
        const level = headingLevel(line);
        if (level === 2) {
            inEntries = area || /^##\s+Entries\b/i.test(line);
            current = null;
            return;
        }
        if (level === 1) {
            inEntries = area;
            current = null;
            return;
        }
        if (!inEntries) return;
        if (level === 3) {
            const heading = ENTRY_HEADING.exec(line);
            current = { id: heading ? heading[1].replace(/[·:—–-]+$/, '') : '', line: index + 1, fields: {}, lines: [] };
            entries.push(current);
            return;
        }
        if (!current) return;
        current.lines.push({ text: line, line: index + 1 });
        const field = FIELD_LINE.exec(line);
        if (field) current.fields[field[1].toLowerCase()] = field[2].trim();
    });
    return entries;
}

/** The repository-relative path an entry's `Spec:` field names, without backticks or anchors. */
function specPathOf(value) {
    const match = /`([^`]+)`/.exec(value || '') || /^(\S+)/.exec(value || '');
    return match ? match[1].replace(/#.*$/, '') : '';
}

/**
 * Audit a map against the specs. `specs` is `[{ path, text }]` with repository-relative
 * POSIX paths. Returns `{ mode, entries, findings }`; each finding has `kind`, `severity`
 * (`error` = the map is wrong, `gap` = coverage is missing) and a message that names the fix.
 */
function auditFeatureMap({ mapText, maps, specs = [] }) {
    // A large project splits the map into an index plus per-area docs; they are audited as one map.
    const docs = maps || [{ path: MAP_FILENAME, text: mapText }];
    const findings = [];
    const add = (kind, severity, detail, extra = {}) => findings.push({ kind, severity, detail, ...extra });
    const parsedSpecs = new Map(specs.map(spec => [spec.path, parseSpec(spec.text)]));
    const allStories = new Set();
    for (const spec of parsedSpecs.values()) for (const id of spec.stories) allStories.add(id);
    const mode = allStories.size > 0 ? 'spec-linked' : 'standalone';

    const entries = docs.flatMap((doc, index) => parseFeatureMap(doc.text, { area: index > 0 }).map(entry => ({ ...entry, file: doc.path })));
    const seen = new Map();
    const covered = new Set();
    const copiedSteps = new Map();
    const copiedRuns = new Map();
    for (const [specPath, spec] of parsedSpecs) {
        for (const step of spec.steps) copiedSteps.set(step, specPath);
        for (const run of spec.runs) copiedRuns.set(run, specPath);
    }

    for (const entry of entries) {
        const isStory = STORY_ID.test(entry.id);
        if (!isStory && !STANDALONE_ID.test(entry.id)) {
            add(
                'invalid-id',
                'error',
                // The heading text is not echoed: it may be anything, including a pasted credential.
                `The entry heading at ${entry.file}:${entry.line} has no stable id. Name it after its spec story (US-<CODE>-<NN>) or give it an FM-<NNN> id.`,
                { file: entry.file, line: entry.line }
            );
            continue;
        }
        if (seen.has(entry.id)) {
            add('duplicate-id', 'error', `${entry.id} appears twice (${seen.get(entry.id)} and ${entry.file}:${entry.line}). Merge the two entries.`, {
                id: entry.id,
                file: entry.file,
                line: entry.line
            });
        }
        seen.set(entry.id, `${entry.file}:${entry.line}`);

        for (const field of REQUIRED_FIELDS) {
            if (!entry.fields[field]) {
                add('missing-field', 'error', `${entry.id} has no "${field}" line. A driver needs it to reach and check the feature.`, {
                    id: entry.id,
                    file: entry.file,
                    line: entry.line
                });
            }
        }

        if (isStory) {
            const specPath = specPathOf(entry.fields.spec);
            const spec = parsedSpecs.get(specPath);
            if (!specPath) {
                add('missing-field', 'error', `${entry.id} has no "Spec" line. A story entry names the spec that owns the story.`, {
                    id: entry.id,
                    file: entry.file,
                    line: entry.line
                });
            } else if (!spec || !spec.stories.has(entry.id)) {
                add(
                    'stale-spec-id',
                    'error',
                    `${entry.id} points at ${specPath}, which ${spec ? 'no longer defines that story' : 'does not exist'}. Re-link the entry to the story that replaced it, or remove it.`,
                    { id: entry.id, file: entry.file, line: entry.line }
                );
            } else {
                covered.add(entry.id);
            }
        }

        for (const item of entry.lines) {
            const mapLine = normalizeStep(item.text);
            if (mapLine.length < MIN_COPIED_STEP_CHARS) continue;
            // A copy is a whole interaction-flow step inside the map line (with or without a field
            // label), or a long run of words pasted from one step.
            const step = [...copiedSteps].find(([text]) => mapLine.includes(text));
            const run = step ? null : wordRuns(mapLine).find(words => copiedRuns.has(words));
            const source = step || (run && [run, copiedRuns.get(run)]);
            if (source) {
                add(
                    'copied-user-path',
                    'error',
                    `${entry.id} copies a user-path step from the interaction flow of ${source[1]}. Link the spec story instead; the spec owns the user path.`,
                    { id: entry.id, file: entry.file, line: item.line }
                );
            }
        }
    }

    for (const doc of docs) {
        for (const hit of findSecretLines(doc.text)) {
            add(
                'secret-value',
                'error',
                `${doc.path}:${hit.line} holds a value shaped like a ${hit.kind}. Name the fixture or credential reference, never the value.`,
                {
                    file: doc.path,
                    line: hit.line
                }
            );
        }
    }

    for (const [specPath, spec] of parsedSpecs) {
        for (const id of [...spec.uiStories].sort()) {
            if (!spec.stories.has(id) || covered.has(id)) continue;
            add('missing-entry', 'gap', `${id} (${specPath}) has an interaction flow but no map entry. Add its driver facts.`, { id });
        }
    }

    // An id that failed the stable-id check is not echoed: the heading may hold anything.
    const listed = entries.map(entry => ({
        id: STORY_ID.test(entry.id) || STANDALONE_ID.test(entry.id) ? entry.id : null,
        file: entry.file,
        line: entry.line
    }));
    return { mode, entries: listed, findings };
}

/** List spec files under a root, bounded, skipping derived index pages. */
function readSpecs(specRoot, repoRoot) {
    const specs = [];
    const walk = dir => {
        let names;
        try {
            names = fs.readdirSync(dir, { withFileTypes: true });
        } catch (error) {
            if (error.code === 'ENOENT') return;
            throw error;
        }
        for (const dirent of names.sort((a, b) => a.name.localeCompare(b.name))) {
            if (specs.length >= MAX_SPEC_FILES) {
                specs.truncated = true;
                return;
            }
            const full = path.join(dir, dirent.name);
            if (dirent.isDirectory()) walk(full);
            else if (dirent.isFile() && dirent.name.endsWith('.md') && dirent.name !== 'INDEX.md') {
                specs.push({ path: path.relative(repoRoot, full).split(path.sep).join('/'), text: fs.readFileSync(full, 'utf8') });
            }
        }
    };
    walk(specRoot);
    return specs;
}

function parseArgs(argv) {
    const options = {};
    for (const arg of argv) {
        const match = /^--(map|specs|root)=(.+)$/.exec(arg);
        if (!match) throw new Error(`Unsupported argument: ${arg}`);
        options[match[1]] = match[2];
    }
    return options;
}

function runCli(argv) {
    if (argv[0] !== 'audit') throw new Error('Use: feature-map.cjs audit [--map=<file>] [--specs=<dir>] [--root=<dir>]');
    const options = parseArgs(argv.slice(1));
    // From a subfolder, the default root is still the project root, so the map is found.
    const root = path.resolve(options.root || require('./project-root.cjs').resolveProjectRoot({ scriptPath: __filename }).rootDir);
    let mapPath = options.map;
    let specRoot = options.specs;
    if (!mapPath || !specRoot) {
        const loader = require('../../hooks/lib/project-config-loader.cjs');
        // The loader resolves the configured roots and their portable defaults.
        if (!mapPath) mapPath = path.join(loader.getDocsRoot('projectReference'), MAP_FILENAME);
        if (!specRoot) specRoot = loader.getSpecDocsPath();
    }
    mapPath = path.resolve(root, mapPath);
    if (!fs.existsSync(mapPath)) {
        return { status: 'NO-MAP', map: path.relative(root, mapPath).split(path.sep).join('/'), findings: [] };
    }
    const rel = file => path.relative(root, file).split(path.sep).join('/');
    const areaDir = path.join(path.dirname(mapPath), 'feature-map');
    const areaFiles = fs.existsSync(areaDir)
        ? fs
              .readdirSync(areaDir)
              .filter(name => name.endsWith('.md'))
              .sort()
              .map(name => path.join(areaDir, name))
        : [];
    const maps = [mapPath, ...areaFiles].map(file => ({ path: rel(file), text: fs.readFileSync(file, 'utf8') }));
    const specs = readSpecs(path.resolve(root, specRoot), root);
    const result = auditFeatureMap({ maps, specs });
    return {
        status: result.findings.length ? 'FINDINGS' : 'CLEAN',
        map: rel(mapPath),
        areaDocs: areaFiles.map(rel),
        ...(specs.truncated ? { specsTruncated: `only the first ${MAX_SPEC_FILES} spec files were read` } : {}),
        ...result
    };
}

module.exports = { MAP_FILENAME, parseSpec, parseFeatureMap, auditFeatureMap, readSpecs, runCli };

if (require.main === module) {
    try {
        const result = runCli(process.argv.slice(2));
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        process.exitCode = result.status === 'FINDINGS' ? 1 : 0;
    } catch (error) {
        process.stderr.write(`Feature-map audit failed: ${error.message}\n`);
        process.exitCode = 2;
    }
}
