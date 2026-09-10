#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const builders = require('./section-builders.cjs');
let resolveMutationProjectRoot;
try {
    ({ resolveMutationProjectRoot } = require('../../../scripts/lib/project-root.cjs'));
} catch {
    // The content-guard and bootstrap paths intentionally support a compact
    // copied skill.  If the optional shared resolver is not present, retain the
    // explicit consuming directory or the invocation cwd without weakening the
    // generator's required-source checks below.
    resolveMutationProjectRoot = ({ cwd = process.cwd(), env = process.env } = {}) => {
        const explicit = env?.CLAUDE_PROJECT_DIR;
        if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') {
            if (!path.isAbsolute(String(explicit).trim())) {
                throw new Error('CLAUDE_PROJECT_DIR must be an absolute path');
            }
            const rootDir = path.resolve(String(explicit).trim());
            let exists = false;
            try { exists = fs.statSync(rootDir).isDirectory(); } catch {}
            if (!exists) throw new Error('CLAUDE_PROJECT_DIR must name an existing directory');
            return { rootDir, source: 'env-fallback' };
        }
        return { rootDir: path.resolve(cwd), source: 'cwd-fallback' };
    };
}

const PROJECT_DIR = resolveMutationProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env, allowUnmarkedRoot: true }).rootDir;
let CONFIG_PATH = path.join(PROJECT_DIR, 'docs', 'project-config.json');
try {
    const { getConfiguredProjectConfigPath } = require('../../../hooks/lib/project-config-loader.cjs');
    CONFIG_PATH = getConfiguredProjectConfigPath();
} catch {
    // Keep the historical default when the portability loader is unavailable.
}
const CLAUDE_MD_PATH = path.join(PROJECT_DIR, 'CLAUDE.md');
const BACKUP_PATH = path.join(PROJECT_DIR, '.claude-md.backup');
const TEMPLATE_PATH = path.join(__dirname, '..', 'references', 'claude-md-template.md');
// Canonical hook-independent Workflow-First Gate (primacy anchor). Stamped at the top of every
// generated/updated CLAUDE.md so the routing rule survives in Codex mirrors when hooks are absent.
const WORKFLOW_GATE_PATH = path.join(__dirname, '..', '..', 'shared', 'workflow-first-gate.md');
const GATE_BLOCK_RE = /<!-- CK:WORKFLOW-GATE -->[\s\S]*?<!-- \/CK:WORKFLOW-GATE -->/g;
// The catalog pointer replaces its owned block. Include legacy prettier fences in
// the match so updating an older full catalog cannot orphan formatting markers.
const SKILLS_BLOCK_RE = /(?:<!-- prettier-ignore-start -->\s*)?<!-- CK:WORKFLOW-SKILLS -->[\s\S]*?<!-- \/CK:WORKFLOW-SKILLS -->(?:\s*<!-- prettier-ignore-end -->)?/g;
// Full always-on protocol blocks (critical-thinking + ai-mistake-prevention) baked at the top
// and, for a complete framework checkout, again at EOF so both primacy and recency survive
// long-context reads. Build-source is the
// canonical markdown (sync-inline-versions.md `:full`), read via the shared parser — the
// generator never couples to hooks/lib. Marker-wrapped so the bake is idempotently strip-and-restamped
// here, deduped from the AGENTS.md CLAUDE-mirror by sync-context-workflows.mjs, and located by the
// Phase 04 freshness verifiers.
const SYNC_INLINE_PATH = path.join(__dirname, '..', '..', 'shared', 'sync-inline-versions.md');
const CK_CRIT_OPEN = '<!-- CK:CRITICAL-THINKING -->';
const CK_CRIT_CLOSE = '<!-- /CK:CRITICAL-THINKING -->';
const CK_AIMP_OPEN = '<!-- CK:AI-MISTAKE-PREVENTION -->';
const CK_AIMP_CLOSE = '<!-- /CK:AI-MISTAKE-PREVENTION -->';
const CK_CRIT_BLOCK_RE = /(?:<!-- prettier-ignore-start -->\s*)?<!-- CK:CRITICAL-THINKING -->[\s\S]*?<!-- \/CK:CRITICAL-THINKING -->(?:\s*<!-- prettier-ignore-end -->)?/g;
const CK_AIMP_BLOCK_RE = /(?:<!-- prettier-ignore-start -->\s*)?<!-- CK:AI-MISTAKE-PREVENTION -->[\s\S]*?<!-- \/CK:AI-MISTAKE-PREVENTION -->(?:\s*<!-- prettier-ignore-end -->)?/g;

const PRETTIER_IGNORE_START = '<!-- prettier-ignore-start -->';
const PRETTIER_IGNORE_END = '<!-- prettier-ignore-end -->';

function prettierIgnoredBlock(body) {
    return `${PRETTIER_IGNORE_START}\n\n${body}\n\n${PRETTIER_IGNORE_END}`;
}

/** Load the one canonical routing policy. Missing detail must not silently weaken it. */
function loadWorkflowGate() {
    try {
        const raw = fs.readFileSync(WORKFLOW_GATE_PATH, 'utf-8');
        const m = raw.match(/<!-- CK:WORKFLOW-GATE -->[\s\S]*?<!-- \/CK:WORKFLOW-GATE -->/);
        if (m) return m[0];
    } catch (err) {
        throw new Error(`Required workflow detail unavailable: ${WORKFLOW_GATE_PATH}: ${err.message}`);
    }
    throw new Error(`Required workflow detail malformed: ${WORKFLOW_GATE_PATH}`);
}

/**
 * Render the route catalog from the consuming bundle when the canonical
 * builder is present.  A compact/partial copied skill intentionally falls back
 * to a pointer so bootstrap can still produce a bounded root without inventing
 * a stale inventory.  The complete framework checkout therefore keeps Claude's
 * static catalog byte-equivalent to the Codex builder, while portable partial
 * installs remain safe and self-describing.
 */
function loadWorkflowSkillsCatalog() {
    const builderPath = path.join(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-skills-catalog.cjs');
    const workflowsPath = path.join(PROJECT_DIR, '.claude', 'workflows.json');
    if (fs.existsSync(builderPath) && fs.existsSync(workflowsPath)) {
        try {
            const { buildWorkflowSkillsCatalog, CK_SKILLS_START, CK_SKILLS_END } = require(builderPath);
            const body = buildWorkflowSkillsCatalog({ rootDir: PROJECT_DIR, sections: ['workflows', 'skills'] });
            return `${PRETTIER_IGNORE_START}\n\n${CK_SKILLS_START}\n${body}\n${CK_SKILLS_END}\n\n${PRETTIER_IGNORE_END}`;
        } catch (error) {
            // A malformed/incomplete copied registry must not stamp a false
            // catalog. The pointer still directs the model to the required
            // canonical files and the builder/verifier reports the detail loss.
            process.stderr.write(`[claude-md-init] workflow catalog unavailable: ${error.message}\n`);
        }
    }
    return '<!-- CK:WORKFLOW-SKILLS -->\n' +
        'Before selecting a workflow, read `.claude/workflows.json` for its intent and canonical sequence; ' +
        'before executing a skill, read its `.claude/skills/<name>/SKILL.md` and applicable project overlay. ' +
        'If required detail is unavailable, stop and report the exact missing path; never invent a skill, sequence or successful completion.\n' +
        '<!-- /CK:WORKFLOW-SKILLS -->';
}

/**
 * Build the marker-wrapped full-protocol blocks (critical-thinking + ai-mistake-prevention)
 * from the canonical source via the shared SYNC parser. Returns ONE string carrying both
 * marker-wrapped blocks, or '' when the source/blocks are
 * unavailable so CLAUDE.md generation never fails on a partial install (gate + catalog still stamp).
 *
 * Approach C: the generator reads canonical `:full` markdown — it does NOT import hooks/lib.
 * Codex mirrors use the legacy-named `.claude/scripts/lib/hookless-prompt-protocol.cjs`, which composes
 * this same canonical text without depending on hook prompt-injection modules. The shared parser
 * normalizes CRLF, so the bake is correct regardless of the working-tree checkout's line endings.
 */
function loadFullProtocolBlocks() {
    try {
        const { extractSyncBody } = require('../../../scripts/lib/extract-sync-block.cjs');
        const md = fs.readFileSync(SYNC_INLINE_PATH, 'utf-8');
        const crit = extractSyncBody(md, 'critical-thinking-mindset:full');
        // Routing is owned by CK:WORKFLOW-GATE. A complete framework checkout projects the
        // canonical AI-mistake block byte-for-byte so Claude/Codex carriers retain the same
        // reminders. A compact copied skill omits the legacy invocation sentence because its
        // bounded bootstrap already carries the authoritative gate and must not reintroduce a
        // competing host-specific Skill-tool instruction.
        const rawAimp = extractSyncBody(md, 'ai-mistake-prevention:full');
        const completeFramework = fs.existsSync(path.join(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-skills-catalog.cjs')) &&
            fs.existsSync(path.join(PROJECT_DIR, '.claude', 'workflows.json'));
        const aimp = completeFramework
            ? rawAimp
            : rawAimp?.split('\n').filter(line => !line.includes('[MANDATORY FIRST ACTION]')).join('\n');
        if (!crit || !aimp) {
            // Fail LOUD, not silent: a missing/partial canonical source must not let the
            // generator ship a protocol-less file as "complete" (the sentinel is gated on
            // protocol availability via sentinelJustified()). Warn so the gap is visible.
            console.error(
                '[WARN] Shared protocol source incomplete — critical-thinking/ai-mistake-prevention :full block(s) ' +
                    `not found in ${SYNC_INLINE_PATH}. CLAUDE.md will NOT be stamped complete until this is restored.`
            );
            return '';
        }
        const critBlock = prettierIgnoredBlock(`${CK_CRIT_OPEN}\n\n${crit}\n\n${CK_CRIT_CLOSE}`);
        const aimpBlock = prettierIgnoredBlock(`${CK_AIMP_OPEN}\n\n${aimp}\n\n${CK_AIMP_CLOSE}`);
        return `${critBlock}\n\n${aimpBlock}`;
    } catch (err) {
        console.error(
            `[WARN] Shared protocol source unavailable (${err && err.message ? err.message : err}). ` +
                'CLAUDE.md will NOT be stamped complete until the canonical :full blocks are readable.'
        );
        return '';
    }
}

const SECTION_OPEN = /^<!-- SECTION:(\S+) -->$/;
const SECTION_CLOSE = /^<!-- \/SECTION:(\S+) -->$/;

// Universal-guides sentinel — stamped at the top of every generated/updated CLAUDE.md.
// The agent-files bootstrap gate reads this to tell a complete file from a project-only
// one. MUST match agent-files-state.cjs UNIVERSAL_GUIDES_VERSION / SENTINEL_RE — the
// agent-files-gate.test.cjs sync test enforces the lockstep.
const UNIVERSAL_GUIDES_VERSION = 6;
const SENTINEL = `<!-- CK:UNIVERSAL-GUIDES v${UNIVERSAL_GUIDES_VERSION} -->`;
const SENTINEL_RE = /<!--\s*CK:UNIVERSAL-GUIDES\s+v(\d+)\s*-->/i;
// Static portable-guide headings the universal section always ships. MUST match
// agent-files-state.cjs REQUIRED_ANCHORS — the agent-files-gate.test.cjs sync test
// enforces the lockstep. The sentinel is a content-presence promise: it may ONLY be
// stamped when these guides are actually in the file, else the bootstrap gate would
// read a false "complete" on a project-only file that never received the guides.
const REQUIRED_ANCHORS = [
    /first action decision/i,
    /workflow step advancement/i,
    /task planning rules/i,
    /code responsibility hierarchy/i,
    /evidence-based reasoning/i,
    /lesson extraction/i,
    /version-control discipline/i
];

function hasGuides(text) {
    return REQUIRED_ANCHORS.every(re => re.test(text));
}

// Restamping replaces owned protocol blocks, so old marker presence cannot prove
// the canonical bodies remain available for the replacement.
function sentinelJustified(text) {
    if (!hasGuides(text)) return false;
    return loadFullProtocolBlocks() !== '';
}

/**
 * Ensure the sentinel state matches the actual content (idempotent).
 * The sentinel asserts "universal guides AND shared protocol present", so it is stamped ONLY
 * when sentinelJustified() holds; otherwise any stale/false sentinel is stripped so the
 * bootstrap gate keeps flagging the file incomplete instead of being fooled by a promise the
 * content does not keep.
 *   - justified + no/old sentinel  → stamp current-version sentinel at the top
 *   - justified + current sentinel → normalize in place (idempotent)
 *   - not justified                → strip any stale/false sentinel, no stamp
 */
function ensureSentinel(content) {
    const text = content.replace(/^﻿/, '');
    if (!sentinelJustified(text)) {
        return text.replace(SENTINEL_RE, '').replace(/^\n+/, '');
    }
    if (SENTINEL_RE.test(text)) {
        return text.replace(SENTINEL_RE, SENTINEL);
    }
    return `${SENTINEL}\n${text}`;
}

/**
 * Stamp the top-of-file header: sentinel first, then the Workflow-First Gate immediately after it.
 * Idempotent — strips any existing gate block (wherever it sits) and re-inserts it right below the
 * sentinel so the routing rule is always the first thing the model reads. The gate is bound to the
 * same content-presence contract as the sentinel (only stamped when the universal guides are
 * present), so project-only files are never force-injected.
 */
function stampHeader(content) {
    let text = ensureSentinel(migrateLegacyRouting(content));
    // Strip every managed block (gate, skills catalog, AND both protocol blocks — top + bottom
    // copies via global regexes). Unmarked custom whitespace remains user-owned.
    text = text
        .replace(GATE_BLOCK_RE, '')
        .replace(SKILLS_BLOCK_RE, '')
        .replace(CK_CRIT_BLOCK_RE, '')
        .replace(CK_AIMP_BLOCK_RE, '')
        // CRLF-aware: a `\r\n\r\n\r\n` run has no consecutive `\n`, so an LF-only
        // pattern here silently leaves the blank gap each stripped block left behind.
        .replace(/^(?:\r?\n)+/, '');
    if (!hasGuides(text)) return text;
    const gate = loadWorkflowGate();
    const skills = loadWorkflowSkillsCatalog();
    const protocol = loadFullProtocolBlocks();
    // Old marker presence cannot justify completeness after those blocks were stripped.
    if (!protocol) text = text.replace(SENTINEL_RE, '');
    // Order: gate (#1 primacy) → workflow/skills catalog → full protocol (still within the first
    // screenful). The route-gate must stay the first stamped block; protocol never precedes it.
    let header = skills ? `${gate}\n\n${skills}` : gate;
    if (protocol) header = `${header}\n\n${protocol}`;
    const m = text.match(SENTINEL_RE);
    if (m) {
        const at = text.indexOf(m[0]) + m[0].length;
        return `${text.slice(0, at)}\n\n${header}\n\n${text.slice(at).replace(/^\n+/, '')}`;
    }
    return `${header}\n\n${text}`;
}

/**
 * Normalize EOF and repeat the full inline protocol for the complete framework checkout.
 * Compact copied skills intentionally keep one bounded copy: their content-guard fixtures do
 * not include the consuming-bundle catalog builder, so duplicating the protocol would make a
 * partial bootstrap exceed its host reference budget. The full portable bundle has both copies,
 * which preserves recency without weakening compact-copy portability.
 */
function stampFooter(content) {
    const normalized = content.endsWith('\n') ? content : `${content}\n`;
    const builderPath = path.join(PROJECT_DIR, '.claude', 'scripts', 'lib', 'workflow-skills-catalog.cjs');
    const workflowsPath = path.join(PROJECT_DIR, '.claude', 'workflows.json');
    if (!fs.existsSync(builderPath) || !fs.existsSync(workflowsPath)) return normalized;
    const protocol = loadFullProtocolBlocks();
    if (!protocol) return normalized;
    return `${normalized.replace(/\s+$/, '')}\n\n${protocol}\n`;
}

// Exact known generated prose only. Unknown edits to this unmarked area remain
// user-owned; never infer ownership from a heading or a loose routing keyword.
function migrateLegacyRouting(content) {
    const legacy = [
        '1. Explicit slash command (e.g. `/plan`, `/feature-implement`) → execute it.',
        '2. Workflow Catalog has a matching workflow → ask via `AskUserQuestion` whether to activate the workflow or run the underlying skill directly.',
        '3. No matching workflow AND prompt would modify files → MUST invoke `/plan <prompt>` first.',
        '4. No matching workflow AND prompt is read-only/conversational → answer directly.'
    ];
    for (const eol of ['\r\n', '\n']) {
        const heading = `## First Action Decision (before any tool call)${eol}${eol}`;
        content = content.replace(heading + legacy.join(eol),
            heading + 'Apply the single CK:WORKFLOW-GATE above; route choice grants no operation authority.');
    }
    return content;
}

/**
 * Extract the static portable-guide sections from the template, keyed by heading.
 * A section spans from a top-level `## ` heading up to the next `## ` heading or a
 * SECTION marker (marker-wrapped sections are generated, not portable), with trailing
 * `---` separators and whitespace stripped. Only placeholder-free sections qualify —
 * the universal guides carry no `{token}` substitutions, so this never injects raw
 * template placeholders.
 * @param {string} templateText
 * @returns {Array<{heading:string, text:string}>}
 */
function extractPortableGuideSections(templateText) {
    const lines = templateText.split('\n');
    const collected = [];
    let current = null;
    const flush = () => {
        if (!current) return;
        let text = current.join('\n').replace(/\s+$/, '');
        text = text.replace(/\n+\s*-{3,}\s*$/, '').replace(/\s+$/, '');
        if (text) collected.push({ heading: current[0].trim(), text });
        current = null;
    };
    for (const line of lines) {
        const trimmed = line.trim();
        if (/^##\s+/.test(trimmed)) {
            flush();
            current = [line];
            continue;
        }
        if (current) {
            if (SECTION_OPEN.test(trimmed) || SECTION_CLOSE.test(trimmed)) {
                flush();
                continue;
            }
            current.push(line);
        }
    }
    flush();
    return collected.filter(s => !/\{[a-z0-9-]+\}/i.test(s.text));
}

/**
 * Back-fill universal-guide sections that drifted out of an existing managed file.
 * For each REQUIRED_ANCHOR not already present in `content`, pull its section from the
 * template and insert the missing block (in anchor order) after the tldr close marker
 * (fallbacks: after the H1 title, else prepend). Idempotent — anchors already present
 * are skipped, so re-runs add nothing.
 *
 * CALLER CONTRACT: invoke ONLY for marker-managed files (hasMarkers === true). A
 * markerless file is project-only / pre-marker; force-injecting guides there would
 * violate the bootstrap-gate "content-presence promise" (see agent-files-state.cjs and
 * the agent-files-gate F1 invariant) and hijack a deliberately project-only CLAUDE.md.
 * @param {string} content
 * @param {string} templateText
 * @returns {string}
 */
function backfillPortableGuides(content, templateText) {
    if (REQUIRED_ANCHORS.every(re => re.test(content))) return content;
    const sections = extractPortableGuideSections(templateText);
    const blocks = [];
    for (const re of REQUIRED_ANCHORS) {
        if (re.test(content)) continue;
        const sec = sections.find(s => re.test(s.heading));
        if (sec) blocks.push(sec.text);
    }
    if (blocks.length === 0) return content;
    const block = `\n${blocks.join('\n\n---\n\n')}\n\n---\n`;

    const TLDR_CLOSE = '<!-- /SECTION:tldr -->';
    const closeIdx = content.indexOf(TLDR_CLOSE);
    if (closeIdx !== -1) {
        const nl = content.indexOf('\n', closeIdx + TLDR_CLOSE.length);
        const at = nl === -1 ? content.length : nl + 1;
        return content.slice(0, at) + block + content.slice(at);
    }
    const h1 = content.match(/^#[ \t]+.*$/m);
    if (h1) {
        const at = content.indexOf(h1[0]) + h1[0].length;
        return `${content.slice(0, at)}\n${block}${content.slice(at)}`;
    }
    return `${block.replace(/^\n/, '')}\n${content}`;
}

// Heading patterns for smart-merge (no markers)
const HEADING_MAP = [
    { pattern: /tl;dr|what you must know/i, key: 'tldr' },
    { pattern: /golden rule/i, key: 'golden-rules' },
    { pattern: /decision quick/i, key: 'decision-quick-ref' },
    { pattern: /key file location|file location/i, key: 'key-locations' },
    { pattern: /development command|dev command/i, key: 'dev-commands' },
    { pattern: /infrastructure port/i, key: 'infra-ports' },
    { pattern: /api.*port|service port/i, key: 'api-ports' },
    { pattern: /integration test/i, key: 'integration-testing' },
    { pattern: /e2e test|end.to.end/i, key: 'e2e-testing' },
    { pattern: /skill activation/i, key: 'skill-activation' },
    { pattern: /documentation (index|system)/i, key: 'doc-index' },
    { pattern: /doc lookup/i, key: 'doc-lookup' }
];

// Builder function map
const BUILDER_MAP = {
    tldr: c => builders.buildTldr(c),
    'golden-rules': c => builders.buildGoldenRules(c),
    'decision-quick-ref': c => builders.buildDecisionQuickRef(c),
    'key-locations': c => builders.buildKeyLocations(c),
    'dev-commands': c => builders.buildDevCommands(c),
    'infra-ports': c => builders.buildInfraPorts(c),
    'api-ports': c => builders.buildApiPorts(c),
    'integration-testing': c => builders.buildIntegrationTesting(c),
    'e2e-testing': c => builders.buildE2eTesting(c),
    'skill-activation': c => builders.buildSkillActivation(c),
    'doc-index': (c, d) => builders.buildDocIndex(c, d),
    'doc-lookup': c => builders.buildDocLookup(c)
};

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
        console.error('[WARN] Failed to parse project-config.json, using empty config');
        return {};
    }
}

function hasMarkers(content) {
    // Match on the TRIMMED line — CLAUDE.md is often CRLF, so a raw line ends in "\r"
    // and SECTION_OPEN's `$` anchor would fail (the marker "looks" absent), misrouting
    // detectMode() to smart-merge and silently skipping the back-fill guard on Windows.
    return content.split('\n').some(l => SECTION_OPEN.test(l.trim()));
}

function detectMode() {
    if (!fs.existsSync(CLAUDE_MD_PATH)) return 'init';
    const content = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
    return hasMarkers(content) ? 'update' : 'smart-merge';
}

function buildSections(config) {
    const sections = {};
    for (const [key, builder] of Object.entries(BUILDER_MAP)) {
        const content = builder(config, PROJECT_DIR);
        if (content) sections[key] = content;
    }
    return sections;
}

function populateTemplate(template, sections) {
    const lines = template.split('\n');
    const output = [];
    let inSection = false;
    let currentKey = null;

    for (const line of lines) {
        const trimmed = line.trim();
        const openMatch = trimmed.match(SECTION_OPEN);
        const closeMatch = trimmed.match(SECTION_CLOSE);

        if (openMatch) {
            currentKey = openMatch[1];
            const content = sections[currentKey];
            if (content) {
                output.push(line); // keep open marker
                output.push('');
                output.push(content);
                output.push('');
                inSection = true;
            } else {
                // No data — skip entire section including markers
                inSection = true;
            }
            continue;
        }

        if (closeMatch) {
            if (sections[currentKey]) {
                output.push(line); // keep close marker
            }
            inSection = false;
            currentKey = null;
            continue;
        }

        if (!inSection) {
            output.push(line);
        }
        // Skip template placeholder lines inside sections
    }

    return output.join('\n');
}

// A curated prose callout: a line carrying a **bold** span (e.g. "**Platform (Windows):** …").
// These are hand-added annotations the data-driven builders do NOT reproduce; silently losing one
// on `--mode update` is the single drift no mirror verifier catches. Table/command/code lines have
// no standalone bold span, so this keys on genuine callouts only — low noise, high signal.
const CURATED_CALLOUT = /\*\*[^*\n]+\*\*/;

// Normalize markdown backslash-escapes before the drop comparison. The committed CLAUDE.md is
// prettier-managed, so prettier escapes characters with markdown meaning (`_SharedCommon` →
// `\_SharedCommon`, `*` → `\*`). The data-driven builders emit the raw, unescaped form, so a
// byte-literal `includes` would report a curated line as "dropped" when only the escaping differs
// and the content is in fact reproduced. Stripping `\` before a punctuation char on BOTH sides
// makes the comparison escape-insensitive — eliminating that false positive while still catching
// genuinely dropped callouts.
function normalizeMdEscapes(s) {
    return s.replace(/\\([\\`*_{}\[\]()#+\-.!~|<>])/g, '$1');
}

// `--mode update` REPLACES each managed section's body with its builder output, discarding whatever
// was there. updateMarkedSections surfaces (advisory, never throws) any curated callout that lived
// in the old body but is absent from the new builder output — converting the silent content-loss
// that dropped the Windows/Design notes this session into a visible WARN that names the durable home.
function updateMarkedSections(existing, sections, onWarn = msg => console.warn(msg)) {
    const hasBuilder = key => Object.prototype.hasOwnProperty.call(sections, key)
        && typeof sections[key] === 'string' && sections[key].length > 0;
    const lines = existing.split('\n');
    let openKey = null;
    for (const line of lines) {
        const open = line.trim().match(SECTION_OPEN);
        const close = line.trim().match(SECTION_CLOSE);
        if (open) {
            if (openKey) throw new Error(`Nested SECTION:${open[1]}; preserve existing root and repair markers first`);
            openKey = open[1];
        }
        if (close) {
            if (openKey !== close[1]) throw new Error(`Unmatched SECTION:${close[1]}; preserve existing root and repair markers first`);
            openKey = null;
        }
    }
    if (openKey) throw new Error(`Unclosed SECTION:${openKey}; preserve existing root and repair markers first`);

    const output = [];
    let inSection = false;
    let currentKey = null;
    let oldBody = [];

    for (const line of lines) {
        const trimmed = line.trim();
        const openMatch = trimmed.match(SECTION_OPEN);
        const closeMatch = trimmed.match(SECTION_CLOSE);

        if (openMatch) {
            currentKey = openMatch[1];
            output.push(line); // keep open marker
            if (hasBuilder(currentKey)) {
                output.push('');
                output.push(sections[currentKey]);
                output.push('');
            }
            inSection = true;
            oldBody = [];
            continue;
        }

        if (closeMatch) {
            if (currentKey && hasBuilder(currentKey)) {
                const newContent = sections[currentKey];
                const newNormalized = normalizeMdEscapes(newContent);
                const dropped = oldBody
                    .map(l => l.trim())
                    .filter(l => CURATED_CALLOUT.test(l) && !newContent.includes(l) && !newNormalized.includes(normalizeMdEscapes(l)));
                if (dropped.length > 0) {
                    onWarn(
                        `[WARN] SECTION:${currentKey} — --mode update dropped ${dropped.length} curated callout line(s) ` +
                            `the builder does not reproduce:\n` +
                            dropped.map(l => `    - ${l}`).join('\n') +
                            `\n  If intentional, ignore. Otherwise move the content into docs/project-config.json ` +
                            `(config-sourced) or the claude-md template static prose so regeneration preserves it.`
                    );
                }
            }
            output.push(line); // keep close marker
            inSection = false;
            currentKey = null;
            oldBody = [];
            continue;
        }

        if (!inSection) {
            output.push(line);
        } else {
            oldBody.push(line); // buffer old body for the content-loss guard above
            if (!hasBuilder(currentKey)) output.push(line); // no builder owns this body
        }
        // Skip old content inside sections — replaced above
    }

    return output.join('\n');
}

// E2E is an optional, config-sourced section that may be enabled after a project already has
// marker-managed CLAUDE.md. Unlike the universal guides, it is intentionally not back-filled into
// every project: insert it only when the builder has verified E2E evidence/profile data. This keeps
// an existing root's unmanaged prose intact while making `--mode update` effective for newly added
// E2E configuration. The init template carries the same marker for fresh roots.
function backfillGeneratedE2eSection(content, sections) {
    const e2e = sections['e2e-testing'];
    if (!e2e || content.split('\n').some(line => line.trim() === '<!-- SECTION:e2e-testing -->')) return content;

    const block = `<!-- SECTION:e2e-testing -->\n\n${e2e}\n\n<!-- /SECTION:e2e-testing -->`;
    // Keep the generated section near the other generated setup sections. Prefer the template's
    // stable location, then degrade safely for older roots that lack one of those markers.
    const anchors = [
        '<!-- /SECTION:dev-commands -->',
        '<!-- /SECTION:integration-testing -->',
        '<!-- /SECTION:tldr -->'
    ];
    for (const anchor of anchors) {
        const at = content.indexOf(anchor);
        if (at === -1) continue;
        const end = at + anchor.length;
        return `${content.slice(0, end)}\n\n${block}${content.slice(end)}`;
    }

    const firstHeading = content.search(/^##\s+/m);
    if (firstHeading !== -1) {
        return `${content.slice(0, firstHeading).replace(/\s+$/, '')}\n\n${block}\n\n${content.slice(firstHeading)}`;
    }
    return `${content.replace(/\s+$/, '')}\n\n${block}\n`;
}

function parseBackupPath(args) {
    let destination = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] !== '--backup-path' && !args[i].startsWith('--backup-path=')) continue;
        if (destination !== null) throw new Error('Duplicate --backup-path option');
        const value = args[i] === '--backup-path' ? args[++i] : args[i].slice('--backup-path='.length);
        if (!value || value.startsWith('--') || !path.isAbsolute(value) || /[\x00-\x1f]/.test(value)) {
            throw new Error('--backup-path requires a valid absolute file path');
        }
        // Resolve the existing parent to reject aliases of protected default/root paths.
        // No directory is created: an unavailable parent is an invalid destination.
        const parent = fs.realpathSync(path.dirname(value));
        destination = path.join(parent, path.basename(value));
        const projectReal = fs.realpathSync(PROJECT_DIR);
        const comparable = p => process.platform === 'win32' ? p.toLowerCase() : p;
        if (['CLAUDE.md', '.claude-md.backup'].some(name =>
            comparable(destination) === comparable(path.join(projectReal, name)))) {
            throw new Error('--backup-path must be separate from CLAUDE.md and the legacy default backup');
        }
    }
    return destination;
}

function createBackup(explicitPath = null) {
    if (explicitPath !== null) {
        // COPYFILE_EXCL atomically refuses occupied files, directories and symlinks.
        // The pre-write root is required; a failure never reaches the root writer.
        fs.copyFileSync(CLAUDE_MD_PATH, explicitPath, fs.constants.COPYFILE_EXCL);
        console.log(`[OK] Owned backup created: ${explicitPath}`);
        return;
    }
    if (fs.existsSync(CLAUDE_MD_PATH)) {
        fs.copyFileSync(CLAUDE_MD_PATH, BACKUP_PATH);
        console.log(`[OK] Backup created: ${path.basename(BACKUP_PATH)}`);
    }
}

// Whole-root size includes preserved user prose. Report overflow, never truncate it
// or force an init rewrite; host adapters own their separate managed-byte budgets.
function reportRootSize(output) {
    const bytes = Buffer.byteLength(output, 'utf8');
    if (bytes > 32768) {
        console.warn(`[WARN] ROOT_OVERFLOW: ${bytes} bytes exceeds 32768-byte host reference budget; ` +
            'full content preserved without truncation. Verify the host managed projection before use.');
    }
}

function main() {
    const args = process.argv.slice(2);
    const backupPath = parseBackupPath(args);
    const modeIndex = args.indexOf('--mode');
    const modeFlag = args.find(a => a.startsWith('--mode='))?.slice('--mode='.length) ||
        (modeIndex >= 0 ? args[modeIndex + 1] : undefined);
    const isDetect = args.includes('--detect');

    if (isDetect) {
        const detected = detectMode();
        console.log(`[DETECT] Mode: ${detected}`);
        console.log(`[DETECT] CLAUDE.md: ${fs.existsSync(CLAUDE_MD_PATH) ? 'EXISTS' : 'MISSING'}`);
        console.log(`[DETECT] project-config.json: ${fs.existsSync(CONFIG_PATH) ? 'EXISTS' : 'MISSING'}`);
        process.exit(0);
    }

    const mode = modeFlag || detectMode();
    console.log(`[MODE] ${mode}`);

    const config = loadConfig();
    const sections = buildSections(config);

    const generated = Object.keys(sections);
    const skipped = Object.keys(BUILDER_MAP).filter(k => !sections[k]);
    console.log(`[SECTIONS] Generated: ${generated.join(', ') || 'none'}`);
    console.log(`[SECTIONS] Skipped (no data): ${skipped.join(', ') || 'none'}`);

    if (mode === 'init') {
        if (!fs.existsSync(TEMPLATE_PATH)) {
            console.error('[ERROR] Template not found:', TEMPLATE_PATH);
            process.exit(1);
        }
        const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
        const output = populateTemplate(template, sections);

        // Replace top-level placeholders
        const projectName = config.project?.name || 'Project';
        const finalOutput = output.replace(/\{project-name\}/g, projectName).replace(/\{project-description\}/g, config.project?.description || '');

        const stamped = stampFooter(stampHeader(finalOutput));
        reportRootSize(stamped);
        createBackup(backupPath);
        fs.writeFileSync(CLAUDE_MD_PATH, stamped, 'utf-8');
        console.log(`[OK] CLAUDE.md created (init mode)`);
    } else if (mode === 'update') {
        if (!fs.existsSync(CLAUDE_MD_PATH)) {
            console.error('[ERROR] CLAUDE.md not found. Use --mode init first.');
            process.exit(1);
        }
        const existing = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8');
        let output = updateMarkedSections(existing, sections);

        const withE2e = backfillGeneratedE2eSection(output, sections);
        if (withE2e !== output) {
            output = withE2e;
            console.log('[OK] Back-filled generated E2E section from project configuration');
        }

        // Back-fill universal-guide sections that drifted out of a managed file (e.g. a
        // CLAUDE.md authored before the current template version). Marker-managed files
        // only — a markerless file is project-only/pre-marker and must not be force-
        // converted (preserves the bootstrap-gate F1 content-presence invariant). The
        // back-fill is what lets ensureSentinel() stamp; without it the gate keeps
        // flagging the file incomplete forever and --mode update is a dead end.
        if (hasMarkers(existing) && fs.existsSync(TEMPLATE_PATH)) {
            const merged = backfillPortableGuides(output, fs.readFileSync(TEMPLATE_PATH, 'utf-8'));
            if (merged !== output) {
                output = merged;
                console.log('[OK] Back-filled missing universal-guide section(s) from template');
            }
        }

        const stamped = stampFooter(stampHeader(output));
        reportRootSize(stamped);
        createBackup(backupPath);
        fs.writeFileSync(CLAUDE_MD_PATH, stamped, 'utf-8');
        console.log(`[OK] CLAUDE.md updated (${generated.length} sections synced)`);
    } else if (mode === 'smart-merge') {
        console.log('[INFO] Smart-merge: CLAUDE.md has no markers. AI should handle migration.');
        console.log('[INFO] Run /claude-md-init in update mode after AI adds markers.');
        process.exit(0);
    } else if (mode === 'refactor') {
        console.log('[INFO] Refactor mode is AI-only. No script action needed.');
        process.exit(0);
    } else {
        console.error(`[ERROR] Unknown mode: ${mode}. Use init, update, or refactor.`);
        process.exit(1);
    }

    // Summary
    const stats = fs.statSync(CLAUDE_MD_PATH);
    const lines = fs.readFileSync(CLAUDE_MD_PATH, 'utf-8').split('\n').length;
    console.log(`[STATS] ${lines} lines, ${(stats.size / 1024).toFixed(1)}KB`);
}

// Run only as a CLI. Importing the module (e.g. the content-loss-guard unit test) must NOT
// trigger a real CLAUDE.md regeneration off the test runner's argv.
if (require.main === module) {
    try {
        main();
    } catch (err) {
        console.error(`[ERROR] ${err.message}`);
        process.exitCode = 1;
    }
}

module.exports = { updateMarkedSections, SECTION_OPEN, SECTION_CLOSE, CURATED_CALLOUT };
