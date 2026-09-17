#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Section builders — convert project-config.json data to markdown sections.
 * Each function returns a string (markdown content) or null (skip section).
 */

// Relocatable roots resolve through the portability accessors so the Claude runtime and the Codex
// mirror generator cannot disagree about where a project's docs and specs live. The require is
// OPTIONAL for the same reason generate-claude-md.cjs:31-37 makes its loader require optional — the
// content-guard and bootstrap paths run a compact copied skill that carries no hooks/lib. When the
// accessors are unavailable the builders degrade to the documented defaults, i.e. exactly the
// literal roots this file used before.
const PORTABILITY = (() => {
    try {
        const loader = require('../../../hooks/lib/project-config-loader.cjs');
        const paths = require('../../../hooks/lib/ck-path-utils.cjs');
        if (typeof loader.getDocsRoot !== 'function' || typeof loader.getSpecDocsPath !== 'function') return null;
        return {
            getDocsRoot: loader.getDocsRoot,
            getSpecDocsPath: loader.getSpecDocsPath,
            normalizeRootPath: paths.normalizeRootPath,
            escapesRepoRoot: paths.escapesRepoRoot,
            joinRoot: paths.joinRoot
        };
    } catch {
        return null;
    }
})();

// Documented defaults, duplicated here ONLY as the degraded-mode answer. Resolution itself is never
// reimplemented — it lives in project-config-loader.cjs PORTABILITY_TOKENS.
const DEFAULT_DOCS_TREE = 'docs';
const DEFAULT_REF_DOCS_ROOT = 'docs/project-reference';
const DEFAULT_SPEC_ROOT = 'docs/specs';

/** Canonical reference-doc filenames the doc-lookup table always routes to. */
const REFERENCE_DOC_ROWS = [
    ['Spec paths, TC format, canonical vs derived spec artifacts', 'spec-system-reference.md'],
    ['Spec quality, AI-implementability, tech-agnostic prose', 'spec-principles.md'],
    ['Behavior or public contract changes, spec-test-code sync', 'workflow-spec-test-code-cycle-reference.md']
];

/** Slash-free `docsRoots.projectReference` root; default `docs/project-reference`. */
function referenceDocsRoot(config) {
    if (!PORTABILITY) return DEFAULT_REF_DOCS_ROOT;
    return PORTABILITY.normalizeRootPath(PORTABILITY.getDocsRoot('projectReference', config || {})) || DEFAULT_REF_DOCS_ROOT;
}

/**
 * Slash-free business spec root; default `docs/specs`.
 *
 * `getSpecDocsPath()` GUARANTEES a trailing slash while the `{SPEC_ROOT}` token resolves slash-free
 * (`project-config-loader.cjs:110-113,169-181`) — the two forms are NOT interchangeable. Every use
 * below CONSTRUCTS a path, so the accessor's slash is trimmed once here and each construction site
 * supplies its own separator.
 */
function specRootPath(config) {
    if (!PORTABILITY) return DEFAULT_SPEC_ROOT;
    return PORTABILITY.normalizeRootPath(PORTABILITY.getSpecDocsPath(config || {})) || DEFAULT_SPEC_ROOT;
}

/** Join a resolved root with segments; a trailing `''` segment requests a trailing slash. */
function underRoot(root, ...segments) {
    if (PORTABILITY) return PORTABILITY.joinRoot(root, ...segments);
    const wantsSlash = segments.length > 0 && segments[segments.length - 1] === '';
    const joined = [root, ...segments.filter(Boolean)].join('/');
    return wantsSlash ? `${joined}/` : joined;
}

/**
 * Resolve the DOCS TREE that `buildDocIndex` scans — the parent of the configured project-reference
 * root, mirroring the one derivation rule already in `session-init-helpers.cjs:27-30`
 * (`DOCS_DIR = path.dirname(REFERENCE_DOCS_DIR)`).
 *
 * SINGLE-SEGMENT GUARD (mandatory, not defensive): `docsRoots.projectReference.path = "reference"`
 * is a legal config value whose `path.dirname` is `'.'` — the REPO ROOT. Scanning that would walk
 * `node_modules/`, `tmp/` and every sibling tree and emit the result into the generated CLAUDE.md.
 * When the parent degenerates to the repo root (or escapes it) the configured root ITSELF is the
 * docs tree, and `projectDir` is never walked.
 *
 * @returns {{root: string, dir: string}} repo-relative slash-free root + its absolute directory
 */
function resolveDocsTree(config, projectDir) {
    const asFallback = () => ({ root: DEFAULT_DOCS_TREE, dir: path.join(projectDir, DEFAULT_DOCS_TREE) });
    if (!PORTABILITY) return asFallback();
    const referenceRoot = PORTABILITY.normalizeRootPath(PORTABILITY.getDocsRoot('projectReference', config || {}));
    if (!referenceRoot || PORTABILITY.escapesRepoRoot(referenceRoot)) return asFallback();
    const parent = PORTABILITY.normalizeRootPath(path.posix.dirname(referenceRoot));
    const degenerate = !parent || parent === '.' || parent === '/' || PORTABILITY.escapesRepoRoot(parent);
    const root = degenerate ? referenceRoot : parent;
    return { root, dir: path.join(projectDir, ...root.split('/')) };
}

/** Visible stand-in for an unresolvable docs tree — keeps the section (and its markers) alive. */
function docsNoteBlock(reason) {
    return '```\n(doc-index unavailable) ' + reason + '\n```';
}

// A runtime backing-service (any datastore/cache/broker, e.g. a DB or message
// queue) is modeled as a kind:"infrastructure" module carrying a meta.port —
// exactly the set buildInfraPorts renders in its own ports table. These are
// runtime dependencies, NOT source-code modules, so they must NOT pollute the
// "Apps/Services" list (buildTldr) or the "Key File Locations" tree
// (buildKeyLocations). Infrastructure CODE modules (an orchestrator/IaC project)
// carry no meta.port and are kept — they ARE real source locations.
function isInfraBackingService(mod) {
    return mod?.kind === 'infrastructure' && mod?.meta?.port != null;
}

const REDACTED_CREDENTIAL = '[REDACTED — use a secret-manager reference]';
const SECRET_VALUE_PATTERN = /\b(?:password|passwd|passphrase|pwd?|pass|token|secret|api[\s_-]*key|private[\s_-]*key|client[\s_-]*secret|access[\s_-]*key|credential)\b["']?\s*[:=]/i;
const SECRET_URI_PATTERN = /^[a-z][a-z\d+.-]*:\/\/[^/\s:@]+:[^@\s]+@/i;
const PRIVATE_KEY_PATTERN = /-----BEGIN [^-]*PRIVATE KEY-----/i;
const TOKEN_PATTERN = /\b(?:sk|pk|ghp|github_pat|xox[baprs]-|AKIA)[A-Za-z0-9_-]{8,}\b/;

function renderCredentialReference(value) {
    if (value === undefined || value === null || value === '') return '—';
    // JSON text follows the same structural policy as config objects, including
    // escaped keys. Never serialize arbitrary fields in a credentials container.
    if (typeof value === 'string' && /^[\[{]/.test(value.trim())) {
        try { value = JSON.parse(value); } catch (_) { return REDACTED_CREDENTIAL; }
    }
    if (typeof value !== 'string') {
        if (!value || Array.isArray(value) || typeof value !== 'object' ||
            Object.keys(value).length !== 1 || !Object.hasOwn(value, 'reference') ||
            typeof value.reference !== 'string' ||
            !/^(?:vault|op):\/\/[^\s@?#]+$/i.test(value.reference)) return REDACTED_CREDENTIAL;
        value = value.reference;
    }
    const text = value.trim();
    if (!text) return '—';
    if (SECRET_VALUE_PATTERN.test(text) || SECRET_URI_PATTERN.test(text) ||
        PRIVATE_KEY_PATTERN.test(text) || TOKEN_PATTERN.test(text)) return REDACTED_CREDENTIAL;
    // Keep references readable in a table while preventing config text from
    // injecting rows or arbitrary Markdown into the generated root.
    return text.replace(/[|\r\n]/g, char => char === '|' ? '\\|' : ' ');
}

function buildTldr(config) {
    const name = config.project?.name || 'Project';
    const desc = config.project?.description || '';
    const langs = config.project?.languages?.join(', ') || '';
    const framework = config.framework?.name || '';
    const modules = config.modules || [];
    const apps = modules.filter(m => !isInfraBackingService(m)).map(m => m.name).join(', ');

    const techParts = [langs, framework].filter(Boolean).join(' + ');
    const lines = [
        `> **Project:** ${name}${desc ? ` — ${desc}` : ''}`,
        `>`,
        techParts ? `> **Tech Stack:** ${techParts}` : null,
        `>`,
        apps ? `> **Apps/Services:** ${apps}` : null
    ].filter(Boolean);

    return lines.join('\n');
}

function buildGoldenRules(config) {
    const groups = config.contextGroups || [];
    const allRules = groups.flatMap(g => g.rules || []);
    if (allRules.length === 0) return null;

    // Deduplicate and number
    const unique = [...new Set(allRules)];
    const lines = unique.map((r, i) => `${i + 1}. ${r}`);
    return `**Golden Rules (memorize these):**\n\n${lines.join('\n')}`;
}

function buildDecisionQuickRef(config) {
    const modules = config.modules || [];
    if (modules.length === 0) return null;

    const rows = [];
    // Framework identity alone does not establish an application architecture.
    if (config.framework?.backendPatternsDoc) {
        rows.push(`| Backend conventions | Read \`${config.framework.backendPatternsDoc}\` |`);
    }
    if (config.databases?.primary) {
        rows.push(`| Data access | Service-specific repository |`);
    }
    if (config.messaging?.broker) {
        rows.push(`| Cross-service sync | Entity Event Consumer (${config.messaging.broker}) |`);
    }

    // Add module-specific patterns
    for (const mod of modules) {
        if (mod.meta?.repository) {
            rows.push(`| ${mod.name} repository | \`${mod.meta.repository}\` |`);
        }
    }

    if (rows.length === 0) return null;
    return `**Decision Quick-Ref:**\n\n| Task | Pattern |\n|---|---|\n${rows.join('\n')}`;
}

function buildKeyLocations(config) {
    const modules = (config.modules || []).filter(m => !isInfraBackingService(m));
    if (modules.length === 0) return null;

    const lines = modules.map(m => {
        const displayPath = (m.pathRegex || '').replace(/\[\\\\\/\]/g, '/').replace(/\\\\/g, '');
        return `${displayPath.padEnd(40)} # ${m.description || m.name}`;
    });

    return '```\n' + lines.join('\n') + '\n```';
}

function buildDevCommands(config) {
    const commands = config.testing?.commands;
    const lines = [];
    if (commands && typeof commands === 'object') {
        for (const [key, cmd] of Object.entries(commands)) {
            if (typeof cmd === 'string') {
                lines.push(`${cmd.padEnd(45)} # ${key}`);
            } else if (typeof cmd === 'object') {
                for (const [subkey, subcmd] of Object.entries(cmd)) {
                    lines.push(`${subcmd.padEnd(45)} # ${key}: ${subkey}`);
                }
            }
        }
    }

    // Optional freetext caveat rendered below the command block (e.g. platform-specific
    // invocation rules). Config-sourced so it survives every regeneration instead of
    // being a hand-edit the next `--mode update` silently wipes. Rendered independently of
    // the command block so a note configured WITHOUT commands is not silently dropped.
    const note = config.testing?.commandsNote;
    const hasNote = typeof note === 'string' && note.trim().length > 0;

    if (lines.length === 0 && !hasNote) return null;

    const parts = [];
    if (lines.length > 0) parts.push('```bash\n' + lines.join('\n') + '\n```');
    if (hasNote) parts.push(note.trim());
    return parts.join('\n\n');
}

function buildInfraPorts(config) {
    // Look for infrastructure modules or well-known infra services
    const infra = [];
    const modules = config.modules || [];

    for (const mod of modules) {
        if (mod.kind === 'infrastructure' && mod.meta?.port) {
            infra.push({
                service: mod.name,
                port: String(mod.meta.port),
                credentials: renderCredentialReference(mod.meta.credentials)
            });
        }
    }

    if (infra.length === 0) return null;

    const rows = infra.map(i => `| ${i.service} | ${i.port} | ${i.credentials} |`);
    return `| Service | Port | Credentials |\n|---|---|---|\n${rows.join('\n')}`;
}

function buildApiPorts(config) {
    const modules = config.modules || [];
    const services = modules.filter(m => m.kind === 'backend-service' && m.meta?.port);
    if (services.length === 0) return null;

    const rows = services.map(s => {
        const ports = Array.isArray(s.meta.ports) ? s.meta.ports.join(', ') : String(s.meta.port);
        return `| ${s.name} | ${ports} |`;
    });

    return `| API Service | Port |\n|---|---|\n${rows.join('\n')}`;
}

function buildIntegrationTesting(config) {
    const doc = config.framework?.integrationTestDoc;
    if (!doc) return null;
    return `See [${path.basename(doc)}](${doc}) for integration test patterns and setup.`;
}

function buildE2eTesting(config) {
    const e2e = config.e2eTesting || {};
    const doc = config.framework?.e2eTestDoc || e2e.guideDoc;
    const frameworks = config.testing?.frameworks || [];
    const execution = e2e.execution || {};
    const hasE2e = frameworks.some(f => /selenium|playwright|cypress|specflow/i.test(f)) ||
        !!e2e.framework || Object.keys(execution).length > 0;

    if (!doc && !hasE2e) return null;

    // Compose a stack descriptor from structured e2eTesting.architecture so the
    // generated line is at least as rich as a hand-authored one (avoids the
    // info-loss that otherwise forces a section to stay hand-authored).
    const PRETTY = {
        selenium: 'Selenium WebDriver',
        playwright: 'Playwright',
        cypress: 'Cypress',
        specflow: 'SpecFlow BDD',
        'page-object-model': 'Page Object Model'
    };
    const arch = e2e.architecture || {};
    const stack = [arch.webDriverType, arch.bddFramework, arch.pattern]
        .map(k => PRETTY[k]).filter(Boolean).join(' + ');
    const docLink = doc
        ? `Full guide: [${path.basename(doc)}](${doc}) for E2E test patterns, page objects, and configuration.`
        : '';

    // Keep generated root context useful without copying commands, credentials,
    // storage state, or arbitrary config text into a broadly consumed document.
    // The project-config remains the source of truth for exact values.
    const executionLines = [];
    const surfaceIds = Array.isArray(execution.surfaceIds) ? execution.surfaceIds : [];
    const surfaces = Array.isArray(config.experienceVerification?.surfaces)
        ? config.experienceVerification.surfaces
        : [];
    if (surfaceIds.length > 0) {
        const lifecycle = surfaceIds.map(id => {
            const surface = surfaces.find(s => s?.id === id);
            return `\`${String(id).replace(/[|\r\n]/g, ' ')}\`${surface?.localRun ? ' (localRun configured)' : ' (localRun must be verified/discovered)'}`;
        });
        executionLines.push(`- **E2E surfaces:** ${lifecycle.join(', ')}; use each surface's configured localRun owner.`);
    } else if (Object.keys(execution).length > 0) {
        executionLines.push('- **E2E surfaces:** resolve surface IDs and localRun ownership from `experienceVerification.surfaces[]`; do not invent lifecycle details.');
    }
    if (execution.auth) {
        const mode = execution.auth.mode ? `\`${String(execution.auth.mode).replace(/[|\r\n]/g, ' ')}\`` : 'configured mode';
        executionLines.push(`- **E2E authentication:** ${mode}; use configured non-secret references/fixtures or the documented manual-login path, never raw credentials.`);
    }
    if (execution.data) {
        const mode = execution.data.mode ? `\`${String(execution.data.mode).replace(/[|\r\n]/g, ' ')}\`` : 'configured policy';
        executionLines.push(`- **E2E data:** ${mode}; use the configured seed/cleanup policy and record data identity without exposing secrets.`);
    }
    if (execution.browser) {
        const runner = execution.browser.runner ? ` runner \`${String(execution.browser.runner).replace(/[|\r\n]/g, ' ')}\`` : '';
        const headed = execution.browser.headed === true ? 'headed/visible' : execution.browser.headed === false ? 'headless' : 'configured visibility';
        executionLines.push(`- **E2E browser:**${runner}; ${headed}. Use the shared bounded waitUntil(condition, options) helper before and after every UI-control operation for readiness/actionability, expected positive/negative outcomes, and applicable error-alert states; apply exactly 500ms of post-operation presentation pacing only at the end for automation and human-QC. This is never a readiness or settle signal.`);
    }
    if (execution.evidence) {
        const capture = Array.isArray(execution.evidence.capture) ? execution.evidence.capture.join(', ') : 'configured capture set';
        executionLines.push(`- **E2E evidence:** capture ${capture}; store under the configured evidence root, read the evidence, and apply the configured redaction policy.`);
    }
    if (execution.convergence) {
        const attempts = execution.convergence.maxAttempts ? `max ${execution.convergence.maxAttempts} attempts` : 'bounded attempts';
        executionLines.push(`- **E2E convergence:** ${attempts}; preserve scope, classify failures before edits, review fixes, and escalate when the contract cannot converge.`);
    }
    const executionProfile = executionLines.length > 0
        ? `\n\nE2E execution profile (read \`docs/project-config.json → e2eTesting.execution\` for exact project facts):\n${executionLines.join('\n')}`
        : '';

    if (stack && docLink) return `${stack}. ${docLink}${executionProfile}`;
    if (stack) return `E2E stack: ${stack}.${executionProfile}`;
    if (docLink) return `${docLink}${executionProfile}`;
    return `E2E testing framework(s): ${frameworks.join(', ')}${executionProfile}`;
}

// Per-file convention classes share one renderer with the file-convention-inject hook and the
// `--lookup` CLI (static parity). Resolution: the sibling framework lib (canonical
// `.claude/skills/...` layout), then the consuming project's `.claude/hooks/lib` (a mirrored
// copy such as `.agents/skills/...` has no sibling hooks/lib). Only when neither exists does a
// compact copied skill keep the historical guide-doc-only table. The project root is the
// generator's resolved project directory when given, else CLAUDE_PROJECT_DIR, else the cwd.
function loadFileConventions(env = process.env, cwd = process.cwd(), projectDir) {
    const envRoot = env && typeof env.CLAUDE_PROJECT_DIR === 'string' && env.CLAUDE_PROJECT_DIR.trim()
        ? env.CLAUDE_PROJECT_DIR.trim()
        : null;
    const projectRoot = typeof projectDir === 'string' && projectDir.trim() ? projectDir : (envRoot || cwd);
    const candidates = [
        path.join(__dirname, '..', '..', '..', 'hooks', 'lib', 'file-conventions.cjs'),
        path.join(projectRoot, '.claude', 'hooks', 'lib', 'file-conventions.cjs')
    ];
    const usable = lib => lib
        && ['injectableEntries', 'sortEntries', 'conventionTag', 'normalizedExtensions'].every(name => typeof lib[name] === 'function')
        && typeof lib.LOOKUP_COMMAND === 'string';
    for (const candidate of candidates) {
        try {
            if (!fs.existsSync(candidate)) continue;
            const lib = require(candidate);
            if (usable(lib)) return lib;
        } catch {
            /* try the next location */
        }
    }
    return null;
}

/** Display form of a path regex in the static table (approximate; the lookup CLI is exact). */
function activationPattern(regex) {
    return regex.replace(/\[\\\\\/\]/g, '/').replace(/\\\\/g, '') + '**';
}

const nonBlank = value => typeof value === 'string' && value.trim();

function tableCell(text) {
    return String(text).replace(/[|\r\n]/g, char => char === '|' ? '\\|' : ' ');
}

const SKILL_ACTIVATION_INTRO = 'When editing files matching these path patterns, pre-read the listed context first:';

function buildSkillActivation(config, projectDir) {
    const groups = config.contextGroups || [];
    if (groups.length === 0) return null;
    const header = '| Path Pattern | Skill / Auto-Context | Pre-Read Files |\n|---|---|---|';
    const conventions = loadFileConventions(process.env, process.cwd(), projectDir);

    if (!conventions) {
        const legacyRows = groups
            .filter(g => g.patternsDoc || g.guideDoc)
            .map(g => {
                const patterns = g.pathRegexes?.map(activationPattern) || [];
                const doc = g.patternsDoc || g.guideDoc || '';
                return `| ${patterns.length ? patterns.map(p => `\`${p}\``).join(', ') : g.name} | _(auto-context)_ | \`${doc}\` |`;
            });
        if (legacyRows.length === 0) return null;
        return `${SKILL_ACTIVATION_INTRO}\n\n${header}\n${legacyRows.join('\n')}`;
    }

    const entries = conventions.sortEntries(conventions.injectableEntries(config));
    if (entries.length === 0) return null;
    const rows = entries.map(entry => {
        const group = entry.group;
        const list = value => (Array.isArray(value) ? value.filter(nonBlank) : []);
        const patterns = list(group.pathRegexes).map(activationPattern)
            .concat(list(group.pathGlobs))
            .concat(list(group.fileNameRegexes).map(r => `name:${r}`));
        const excludes = list(group.excludePathRegexes).map(activationPattern).concat(list(group.excludePathGlobs));
        const extensions = conventions.normalizedExtensions(group);
        // Membership is extension filter AND any include AND no exclude (BR-PFCI-02): a row that
        // omitted the filter or the exclusions would claim files the hook never matches.
        let patternCell = patterns.length ? patterns.map(p => `\`${tableCell(p)}\``).join(', ') : tableCell(entry.name);
        if (extensions.length) patternCell += ` ext ${extensions.map(e => `\`${tableCell(e)}\``).join(', ')}`;
        if (excludes.length) patternCell += ` · not ${excludes.map(p => `\`${tableCell(p)}\``).join(', ')}`;
        const skillCell = entry.skills.length ? entry.skills.map(s => `\`${tableCell(s)}\``).join(', ') : '_(auto-context)_';
        const docCell = entry.docs.map(d => `\`${tableCell(d)}\``).concat(`\`${conventions.conventionTag(entry)}\``).join(', ');
        return `| ${patternCell} | ${skillCell} | ${docCell} |`;
    });
    return `${SKILL_ACTIVATION_INTRO} (no hook: \`${conventions.LOOKUP_COMMAND} <path>\`)\n\n${header}\n${rows.join('\n')}`;
}

function buildDocIndex(config, projectDir) {
    const { root: docsRoot, dir: docsDir } = resolveDocsTree(config, projectDir);
    // NEVER return falsy here. generate-claude-md.cjs drops the WHOLE section INCLUDING its
    // `<!-- SECTION:doc-index -->` markers when a builder returns falsy (`:452-459` skips the open
    // marker, `:465-472` pushes the close marker only `if (sections[currentKey])`). That drop is
    // correct for a section that does not APPLY to a project; "I could not find the docs tree" is a
    // different case, and returning null for it deleted the markers so `--mode update` could never
    // restore the block. A visible note keeps the markers and makes the miss recoverable.
    if (!fs.existsSync(docsDir)) return docsNoteBlock(`no documentation tree at the resolved path: ${docsRoot}/`);

    // Count markdown at ANY depth, not just the top level. A one-level count is correct only for
    // a flat docs folder, which every `docs/<x>/` here happened to be EXCEPT `docs/specs/` — whose
    // canonical layout is always nested (`<Capability>/README.*.md`). That folder therefore
    // reported `(0 files)` permanently while holding three specs, contradicting two other lines of
    // the same generated file. Depth-capped so a stray deep tree cannot make generation expensive.
    const countMarkdownDeep = (dir, depth = 0) => {
        if (depth > 4) return 0;
        let total = 0;
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            if (item.name.startsWith('.')) continue;
            if (item.isDirectory()) total += countMarkdownDeep(path.join(dir, item.name), depth + 1);
            else if (item.name.endsWith('.md')) total += 1;
        }
        return total;
    };

    const tree = [];
    const entries = fs.readdirSync(docsDir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.name.startsWith('.')) continue;
        if (entry.isDirectory()) {
            const subfiles = countMarkdownDeep(path.join(docsDir, entry.name));
            tree.push(`${docsRoot}/${entry.name}/  (${subfiles} files)`);
        } else if (entry.name.endsWith('.md')) {
            tree.push(`${docsRoot}/${entry.name}`);
        }
    }

    if (tree.length === 0) return docsNoteBlock(`no documents under the resolved path: ${docsRoot}/`);
    return '```\n' + tree.join('\n') + '\n```';
}

function buildDocLookup(config) {
    const modules = config.modules || [];
    const featureRoot = specRootPath(config);
    const referenceRoot = referenceDocsRoot(config);

    const rows = modules
        .filter(m => m.meta?.domain)
        .map(m => {
            const docPath = underRoot(featureRoot, m.name, '');
            return `| ${m.meta.domain} | \`${docPath}\` |`;
        });

    rows.push(`| Feature specs, capability behavior, business rules, test cases | \`${underRoot(featureRoot, '')}\` + \`${underRoot(referenceRoot, 'feature-spec-reference.md')}\` |`);
    for (const [topic, file] of REFERENCE_DOC_ROWS) {
        rows.push(`| ${topic} | \`${underRoot(referenceRoot, file)}\` |`);
    }

    // Add framework docs
    if (config.framework?.backendPatternsDoc) {
        rows.push(`| Backend patterns, CQRS, validation | \`${config.framework.backendPatternsDoc}\` |`);
    }
    if (config.framework?.frontendPatternsDoc) {
        rows.push(`| Frontend patterns, components, stores | \`${config.framework.frontendPatternsDoc}\` |`);
    }

    return `| If user prompt mentions... | Read first |\n|---|---|\n${rows.join('\n')}`;
}

module.exports = {
    buildTldr,
    REDACTED_CREDENTIAL,
    renderCredentialReference,
    buildGoldenRules,
    buildDecisionQuickRef,
    buildKeyLocations,
    buildDevCommands,
    buildInfraPorts,
    buildApiPorts,
    buildIntegrationTesting,
    buildE2eTesting,
    buildSkillActivation,
    activationPattern,
    buildDocIndex,
    buildDocLookup
};
