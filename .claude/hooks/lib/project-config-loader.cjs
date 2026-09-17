#!/usr/bin/env node
/**
 * Project Config Loader
 *
 * Loads the configured project config file and provides helper functions
 * for hooks that need project-specific path patterns.
 *
 * Usage:
 *   const { loadProjectConfig, getModules, getContextGroup, isConfigPopulated } = require('./lib/project-config-loader.cjs');
 *   const config = loadProjectConfig();
 *   const modules = getModules('backend-service');     // v2 modules[] with v1 fallback
 *   const group = getContextGroup('src/Services/x.cs'); // context group matching
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadConfig, DEFAULT_PORTABILITY } = require('./ck-config-loader.cjs');
const { resolveProjectRoot } = require('./project-root.cjs');
const { normalizeRootPath, escapesRepoRoot, isPathWithinRoot } = require('./ck-path-utils.cjs');

// Resolve from the nearest portable bundle, not the caller's current directory.
// This keeps Claude hooks and Codex entrypoints equivalent when invoked from a
// nested worktree or a copied bundle.  Explicit CLAUDE_PROJECT_DIR remains the
// highest-priority override for test fixtures and host integrations.
const PROJECT_DIR = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;

function resolveConfiguredPath(configuredPath, fallbackPath) {
    const rawPath = configuredPath || fallbackPath;
    return path.isAbsolute(rawPath) ? rawPath : path.join(PROJECT_DIR, rawPath);
}

function getConfiguredProjectConfigPath() {
    try {
        const ckConfig = loadConfig({
            includeProject: false,
            includeAssertions: false,
            includeLocale: false
        });
        return resolveConfiguredPath(ckConfig.portability?.projectConfigPath, DEFAULT_PORTABILITY.projectConfigPath);
    } catch {
        return resolveConfiguredPath(DEFAULT_PORTABILITY.projectConfigPath);
    }
}

function getConfiguredDocsIndexPath() {
    try {
        const ckConfig = loadConfig({
            includeProject: false,
            includeAssertions: false,
            includeLocale: false
        });
        return resolveConfiguredPath(ckConfig.portability?.docsIndexPath, DEFAULT_PORTABILITY.docsIndexPath);
    } catch {
        return resolveConfiguredPath(DEFAULT_PORTABILITY.docsIndexPath);
    }
}

const CONFIG_PATH = getConfiguredProjectConfigPath();

let _cache = null;

/**
 * Load project-config.json. Returns empty object on failure.
 * Result is cached for the process lifetime.
 */
function loadProjectConfig() {
    if (_cache) return _cache;
    try {
        _cache = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    } catch {
        _cache = {};
    }
    return _cache;
}

// ─────────────────────────────────────────────────────────────────────────────
// Relocatable docs/spec roots — CONFIGURED, with the framework literal as fallback
//
// Every root below is declarable in docs/project-config.json (`specRoots`,
// `docsRoots`). A project that declares nothing gets the exact literal the
// framework always used, so the unset path is byte-identical to the fixed-root
// behaviour these accessors replaced.
//
// TWO-PLANE CONTRACT (read this before assuming a bad config is caught):
// Validation plane = fail-CLOSED — `node project-config-schema.cjs --validate
// docs/project-config.json` errors on a declared-but-invalid key. Runtime plane =
// fail-SOFT — `loadProjectConfig` catches every read/parse error and caches `{}`
// (`:66-74`), so a malformed config is INDISTINGUISHABLE from an absent one and
// every accessor here returns its documented default. See ADR-0003.
//
// Fail-soft is deliberate, not an oversight: an accessor that threw on a bad
// config would run inside hooks and block every tool call in the session — a
// worse failure than a wrong path. No accessor below throws.
//
// This reverses the earlier fixed-root design at the user's explicit request: a
// project that relocates its specs had no way to tell the framework, and the one
// runtime line that tells the AI where specs live (`:507`) reported `docs/specs/`
// regardless. Predictability across copied frameworks is preserved by the
// defaults, not by refusing configuration.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 8 portability tokens — the SINGLE definition of what each one means.
 *
 * `.claude/scripts/codex/sync-context-workflows.mjs` reads THIS table so the Claude
 * runtime and the Codex mirror generator cannot disagree about `{SPEC_ROOT}` by
 * construction. Adding a token here is the only place a token is born.
 *
 * Every value resolves SLASH-FREE (file tokens resolve to a file path); prose in
 * the consuming text supplies its own separator, so `{PLANS_ROOT}/{plan-id}/`
 * cannot produce `plans//`. The two spec ACCESSORS below keep their historical
 * trailing slash — the token and the accessor deliberately return different forms.
 *
 * @type {Record<string, {configPath: string, default: string}>}
 */
const PORTABILITY_TOKENS = {
    SPEC_ROOT: { configPath: 'specRoots.business.path', default: 'docs/specs' },
    SPEC_ROOT_TECHNICAL: { configPath: 'specRoots.technical.path', default: 'docs/specs-technical' },
    REF_DOCS_ROOT: { configPath: 'docsRoots.projectReference.path', default: 'docs/project-reference' },
    ADR_ROOT: { configPath: 'docsRoots.adr.path', default: 'docs/adr' },
    TEMPLATES_ROOT: { configPath: 'docsRoots.templates.path', default: 'docs/templates' },
    PLANS_ROOT: { configPath: 'docsRoots.plans.path', default: 'plans' },
    TEAM_ARTIFACTS_ROOT: { configPath: 'docsRoots.teamArtifacts.path', default: 'team-artifacts' },
    PRODUCT_ROADMAP_DOC: { configPath: 'docsRoots.productRoadmap.path', default: 'docs/product-roadmap.md' }
};

/** `docsRoots` key -> the token that owns its default. */
const DOCS_ROOT_TOKENS = {
    projectReference: 'REF_DOCS_ROOT',
    adr: 'ADR_ROOT',
    templates: 'TEMPLATES_ROOT',
    plans: 'PLANS_ROOT',
    teamArtifacts: 'TEAM_ARTIFACTS_ROOT',
    productRoadmap: 'PRODUCT_ROADMAP_DOC'
};

function ensureTrailingSlash(p) {
    return p.endsWith('/') ? p : p + '/';
}

/** Read a dotted path out of a plain object without throwing on any missing hop. */
function readConfigPath(config, dottedPath) {
    let node = config;
    for (const key of dottedPath.split('.')) {
        if (!node || typeof node !== 'object') return undefined;
        node = node[key];
    }
    return node;
}

/**
 * Resolve one token to its slash-free value. Fail-SOFT by construction: a blank,
 * non-string, or repo-escaping configured value returns the documented default.
 *
 * @param {string} token - key of PORTABILITY_TOKENS
 * @param {object} [config] - parsed project-config.json; loaded + cached if omitted
 * @returns {string} resolved slash-free root, or '' for an unknown token
 */
function resolvePortabilityToken(token, config) {
    const spec = PORTABILITY_TOKENS[token];
    if (!spec) return '';
    const cfg = config || loadProjectConfig();
    const normalized = normalizeRootPath(readConfigPath(cfg, spec.configPath));
    if (!normalized || escapesRepoRoot(normalized)) return spec.default;
    return normalized;
}

/**
 * Business feature/spec root, trailing slash GUARANTEED.
 *
 * Resolves `specRoots.business.path`; falls back to `'docs/specs/'`. The trailing
 * slash is part of the long-standing contract — callers such as
 * `doc-sync-classify.cjs:30,131` CONSTRUCT paths from it — so it is preserved even
 * though the `{SPEC_ROOT}` token resolves slash-free.
 *
 * @param {object} [config] - parsed project-config.json; loaded + cached if omitted
 * @returns {string} e.g. 'docs/specs/'
 */
function getSpecDocsPath(config) {
    return ensureTrailingSlash(resolvePortabilityToken('SPEC_ROOT', config));
}

/**
 * Technical spec root, trailing slash GUARANTEED. Same contract as
 * `getSpecDocsPath` over `specRoots.technical.path`; default `'docs/specs-technical/'`.
 *
 * @param {object} [config] - parsed project-config.json; loaded + cached if omitted
 * @returns {string} e.g. 'docs/specs-technical/'
 */
function getTechnicalSpecDocsPath(config) {
    return ensureTrailingSlash(resolvePortabilityToken('SPEC_ROOT_TECHNICAL', config));
}

/**
 * Resolve one of the 6 `docsRoots` keys — `projectReference`, `adr`, `templates`,
 * `plans`, `teamArtifacts`, `productRoadmap`.
 *
 * Returns a SLASH-FREE root (`productRoadmap` returns a file path), so prose can
 * compose `${getDocsRoot('plans')}/${planId}/` without producing `plans//`. An
 * unknown key returns `''` rather than throwing — see the fail-soft note above.
 *
 * @param {string} key - docsRoots key
 * @param {object} [config] - parsed project-config.json; loaded + cached if omitted
 * @returns {string} slash-free root, or '' for an unknown key
 */
function getDocsRoot(key, config) {
    const token = DOCS_ROOT_TOKENS[key];
    if (!token) return '';
    return resolvePortabilityToken(token, config);
}

/**
 * Resolve portability path tokens in text destined for the AI.
 *
 * Single source of truth — the Codex mirror generator
 * (.claude/scripts/codex/sync-context-workflows.mjs) requires THIS function so both
 * runtimes resolve identically.
 *
 * Unknown `{...}` sequences are left UNTOUCHED ON PURPOSE: `workflows.json` prose
 * carries `{Bucket}`, `{FeatureName}`, `{plan-id}` and `{n}` placeholders that are
 * instructions to the AI, not paths. Only the 8 keys of `PORTABILITY_TOKENS` are
 * replaced.
 *
 * @param {string} text - raw text (workflow description / injectContext / whenToUse)
 * @param {object} [config] - parsed project-config.json; loaded + cached if omitted
 * @returns {string} text with known tokens resolved; non-strings returned unchanged
 */
function resolvePortabilityTokens(text, config) {
    if (typeof text !== 'string' || !text) return text;
    if (!text.includes('{')) return text;
    const cfg = config || loadProjectConfig();
    return text.replace(/\{([A-Z][A-Z0-9_]*)\}/g, (match, token) =>
        Object.prototype.hasOwnProperty.call(PORTABILITY_TOKENS, token)
            ? resolvePortabilityToken(token, cfg)
            : match
    );
}

/**
 * Convert a string→string map (name → regexString) into a string→RegExp map.
 * @param {Record<string,string>} map - e.g. { "ServiceA": "Services[\\/]ServiceA" }
 * @returns {Record<string,RegExp>}
 */
function buildRegexMap(map) {
    if (!map) return {};
    const result = {};
    for (const [key, pattern] of Object.entries(map)) {
        try {
            result[key] = new RegExp(pattern, 'i');
        } catch {
            /* skip invalid regex */
        }
    }
    return result;
}

/**
 * Convert a pattern list (array of { name, pathRegex/pathRegexes, description, ... }) into
 * an array of { name, patterns: RegExp[], description, ...rest }.
 * Extra properties (quickTips, scssExamples, docFile, etc.) are forwarded as-is.
 * @param {Array} list
 * @returns {Array<{name:string, patterns:RegExp[], description:string, [key:string]:any}>}
 */
function buildPatternList(list) {
    if (!list || !Array.isArray(list)) return [];
    return list.map(item => {
        let patterns = [];
        if (item.pathRegexes) {
            for (const r of item.pathRegexes) {
                try {
                    patterns.push(new RegExp(r, 'i'));
                } catch {
                    /* skip invalid regex */
                }
            }
        } else if (item.pathRegex) {
            try {
                patterns.push(new RegExp(item.pathRegex, 'i'));
            } catch {
                /* skip invalid regex */
            }
        }
        // Forward all extra properties from config (quickTips, scssExamples, docFile, etc.)
        const { pathRegexes, pathRegex, ...rest } = item;
        return {
            ...rest,
            patterns,
            description: item.description || ''
        };
    });
}

/**
 * Get modules filtered by kind. Falls back to building from v1 sections.
 * @param {string} [kind] - e.g., 'backend-service', 'frontend-app', 'library'
 * @returns {Array<{name:string, kind:string, pathRegex:string, description?:string, tags?:string[], meta?:object}>}
 */
function getModules(kind) {
    const config = loadProjectConfig();
    let modules = config.modules || [];

    // v1 fallback: build modules from backendServices + frontendApps
    if (modules.length === 0) {
        modules = [];
        const svcMap = config.backendServices?.serviceMap || {};
        for (const [name, regex] of Object.entries(svcMap)) {
            modules.push({
                name,
                kind: 'backend-service',
                pathRegex: regex,
                description: config.backendServices?.serviceDomains?.[name] || '',
                meta: { repository: config.backendServices?.serviceRepositories?.[name] }
            });
        }
        const appMap = config.frontendApps?.appMap || {};
        const legacy = new Set(config.frontendApps?.legacyApps || []);
        for (const [name, regex] of Object.entries(appMap)) {
            modules.push({
                name,
                kind: 'frontend-app',
                pathRegex: regex,
                meta: { generation: legacy.has(name) ? 'legacy' : 'modern' }
            });
        }
    }

    return kind ? modules.filter(m => m.kind === kind) : modules;
}

/**
 * Find the context group matching a file path and extension.
 * @param {string} filePath - File path to match
 * @returns {object|null} Matching context group or null
 */
function getContextGroup(filePath) {
    const config = loadProjectConfig();
    const groups = config.contextGroups || [];
    const normalized = (filePath || '').replace(/\\/g, '/');
    const ext = '.' + normalized.split('.').pop();

    for (const group of groups) {
        const extMatch = !group.fileExtensions || group.fileExtensions.length === 0 || group.fileExtensions.includes(ext);
        if (!extMatch) continue;
        for (const regex of group.pathRegexes || []) {
            try {
                if (new RegExp(regex, 'i').test(normalized)) return group;
            } catch {
                /* skip invalid */
            }
        }
    }

    return null;
}

/**
 * Find the module matching a file path.
 * @param {string} filePath - File path to match
 * @returns {object|null} Matching module or null
 */
function getModuleForPath(filePath) {
    const modules = getModules();
    const normalized = (filePath || '').replace(/\\/g, '/');
    for (const mod of modules) {
        try {
            if (new RegExp(mod.pathRegex, 'i').test(normalized)) return mod;
        } catch {
            /* skip */
        }
    }
    return null;
}

/**
 * Resolve a section by v2 name, falling back to v1 alias.
 * E.g., resolveSection('styling', 'scss') returns config.styling || config.scss
 * @param {string} v2Name - v2 section name
 * @param {string} v1Name - v1 section name (deprecated alias)
 * @returns {object|null}
 */
function resolveSection(v2Name, v1Name) {
    const config = loadProjectConfig();
    return config[v2Name] || config[v1Name] || null;
}

/**
 * Aggregate all file extensions from contextGroups + styling into a single array.
 * Useful for hooks that need to know ALL code file extensions.
 * @returns {string[]} e.g., ['.cs', '.ts', '.tsx', '.html', '.scss', '.css', '.sass', '.less']
 */
function getAllFileExtensions() {
    const config = loadProjectConfig();
    const exts = new Set();
    for (const group of config.contextGroups || []) {
        for (const ext of group.fileExtensions || []) exts.add(ext);
    }
    for (const ext of config.styling?.fileExtensions || []) exts.add(ext);
    return [...exts];
}

/**
 * Compile an array of regex strings into RegExp objects.
 * Invalid regex patterns are ignored.
 * @param {string[]|undefined} patterns
 * @returns {RegExp[]}
 */
function compileRegexArray(patterns) {
    if (!Array.isArray(patterns)) return [];
    const result = [];
    for (const pattern of patterns) {
        if (typeof pattern !== 'string') continue;
        try {
            result.push(new RegExp(pattern, 'i'));
        } catch {
            /* skip invalid regex */
        }
    }
    return result;
}

/**
 * Get normalized localization settings from project config.
 * @param {object} [config] - Parsed project-config.json. If omitted, loads from disk.
 * @returns {{enabled:boolean,supportedLocales:string[],defaultLocale:string,translationFilePatterns:RegExp[],uiPathPatterns:RegExp[]}}
 */
function getLocalizationConfig(config) {
    if (config === undefined) config = loadProjectConfig();
    const localization = config?.localization;
    if (!localization || typeof localization !== 'object') {
        return {
            enabled: false,
            supportedLocales: [],
            defaultLocale: '',
            translationFilePatterns: [],
            uiPathPatterns: []
        };
    }

    const supportedLocales = Array.isArray(localization.supportedLocales)
        ? localization.supportedLocales.filter(locale => typeof locale === 'string' && locale.trim().length > 0)
        : [];

    return {
        enabled: localization.enabled === true,
        supportedLocales,
        defaultLocale: typeof localization.defaultLocale === 'string' ? localization.defaultLocale : '',
        translationFilePatterns: compileRegexArray(localization.translationFilePatterns),
        uiPathPatterns: compileRegexArray(localization.uiPathPatterns)
    };
}

/**
 * True when project explicitly enables localization and has multiple supported locales.
 * @param {object} [config] - Parsed project-config.json. If omitted, loads from disk.
 * @returns {boolean}
 */
function isMultilingualProject(config) {
    const localization = getLocalizationConfig(config);
    return localization.enabled && localization.supportedLocales.length > 1;
}

/**
 * Check if a parsed project config has been populated with real values.
 * "Populated" = has a non-empty project.name AND at least one substantive section
 * (modules, services, contextGroups, framework with real name, testing, e2eTesting, styling, etc.)
 * This is generic — works for any project type (backend, frontend, full-stack, static site).
 * @param {object} [config] - Parsed project-config.json. If omitted, loads from disk.
 * @returns {boolean}
 */
function isConfigPopulated(config) {
    if (config === undefined) config = loadProjectConfig();
    if (!config || typeof config !== 'object') return false;
    const hasName = config.project?.name?.trim().length > 0;
    if (!hasName) return false;

    // Check any substantive section is populated (not just modules/services)
    const hasModules = Array.isArray(config.modules) && config.modules.length > 0;
    const hasServices = !!(config.backendServices?.serviceMap && Object.keys(config.backendServices.serviceMap).some(k => k !== 'ExampleService'));
    const hasContextGroups = Array.isArray(config.contextGroups) && config.contextGroups.length > 0;
    const hasFramework = !!(config.framework?.name?.trim().length > 0 && config.framework.name !== 'ExampleFramework');
    const hasTesting = !!(config.testing?.frameworks?.length > 0 || config.e2eTesting?.framework?.trim().length > 0);
    const hasStyling = !!(config.styling?.technology?.trim().length > 0 || (config.scss?.appMap && Object.keys(config.scss.appMap).length > 0));
    const hasFrontendApps = !!(config.frontendApps?.appMap && Object.keys(config.frontendApps.appMap).length > 0);
    const hasLocalization = !!(config.localization && (Array.isArray(config.localization.supportedLocales) || Array.isArray(config.localization.translationFilePatterns)));

    return hasModules || hasServices || hasContextGroups || hasFramework || hasTesting || hasStyling || hasFrontendApps || hasLocalization;
}

/** Directory name of the knowledge workspace inside the resolved docs tree. */
const KNOWLEDGE_DIR_NAME = 'knowledge';

/**
 * Knowledge workspace root, DERIVED from the resolved docs tree.
 *
 * The workspace is the `knowledge/` sibling of the project-reference root, so a project
 * that relocates its docs to `documentation/reference` gets `documentation/knowledge`.
 * Falls back to `docs/knowledge` when the reference root has no parent directory.
 *
 * @param {object} [config] - parsed project-config.json; loaded + cached if omitted
 * @returns {string} slash-free knowledge root, e.g. 'docs/knowledge'
 */
function getKnowledgeRoot(config) {
    const referenceRoot = normalizeRootPath(getDocsRoot('projectReference', config));
    const parent = referenceRoot.includes('/')
        ? referenceRoot.slice(0, referenceRoot.lastIndexOf('/'))
        : '';
    if (!parent) return `docs/${KNOWLEDGE_DIR_NAME}`;
    return `${parent}/${KNOWLEDGE_DIR_NAME}`;
}

/**
 * Is this file path inside the knowledge workspace?
 *
 * Used by coding-specific hooks to skip injection on knowledge files. Matching is
 * SEGMENT-BOUNDARY (`isPathWithinRoot`), not a frozen `docs/knowledge` regex, so a
 * relocated docs tree still routes and a sibling such as `docs/knowledge-archive/`
 * no longer fails open into the workspace.
 *
 * Accepts a repo-relative path or an absolute path under the project root; an absolute
 * path is reduced to its repo-relative form before comparison.
 *
 * @param {string} filePath - repo-relative or absolute path
 * @param {object} [config] - parsed project-config.json; loaded + cached if omitted
 * @returns {boolean}
 */
function isKnowledgePath(filePath, config) {
    if (!filePath) return false;
    const normalized = normalizeRootPath(filePath);
    if (!normalized) return false;
    const root = getKnowledgeRoot(config);
    if (isPathWithinRoot(normalized, root)) return true;
    const repoRoot = normalizeRootPath(PROJECT_DIR);
    if (repoRoot && normalized.toLowerCase().startsWith(`${repoRoot.toLowerCase()}/`)) {
        return isPathWithinRoot(normalized.slice(repoRoot.length + 1), root);
    }
    return false;
}

/**
 * Generate a compact project structure summary from project-config.json.
 * 100% data-driven — no hardcoded project knowledge. Returns empty string
 * if config is not populated.
 * @param {object} [config] - Parsed config. If omitted, loads from disk.
 * @returns {string} Multi-line summary (~30-60 lines depending on config richness)
 */
function generateProjectSummary(config) {
    if (config === undefined) config = loadProjectConfig();
    if (!config || !isConfigPopulated(config)) return '';

    const lines = [];
    const p = config.project || {};

    // --- Project header ---
    lines.push(`**${p.name || 'Project'}**${p.description ? ` — ${p.description}` : ''}`);
    const meta = [];
    if (p.languages?.length) meta.push(`Languages: ${p.languages.join(', ')}`);
    if (p.packageManagers?.length) meta.push(`PM: ${p.packageManagers.join(', ')}`);
    if (p.monorepoTool) meta.push(`Monorepo: ${p.monorepoTool}`);
    if (meta.length) lines.push(meta.join(' | '));

    // --- Modules by kind ---
    const modules = config.modules || [];
    if (modules.length > 0) {
        const byKind = {};
        for (const m of modules) {
            const k = m.kind || 'other';
            if (!byKind[k]) byKind[k] = [];
            byKind[k].push(m.name);
        }
        lines.push('');
        lines.push(`**Modules (${modules.length}):**`);
        for (const [kind, names] of Object.entries(byKind)) {
            if (names.length <= 5) {
                lines.push(`  ${kind}: ${names.join(', ')}`);
            } else {
                lines.push(`  ${kind} (${names.length}): ${names.slice(0, 4).join(', ')}, ... +${names.length - 4} more`);
            }
        }
    }

    // --- Framework ---
    const fw = config.framework;
    if (fw?.name) {
        lines.push('');
        lines.push(`**Framework:** ${fw.name}`);
        if (fw.searchPatternKeywords?.length) {
            lines.push(
                `  Key patterns: ${fw.searchPatternKeywords.slice(0, 8).join(', ')}${fw.searchPatternKeywords.length > 8 ? ` (+${fw.searchPatternKeywords.length - 8})` : ''}`
            );
        }
    }

    // --- Context groups ---
    const groups = config.contextGroups || [];
    if (groups.length > 0) {
        lines.push('');
        lines.push('**Context Groups:**');
        for (const g of groups) {
            const parts = [g.name];
            if (g.fileExtensions?.length) parts.push(`[${g.fileExtensions.join(', ')}]`);
            if (g.patternsDoc) parts.push(`→ ${g.patternsDoc}`);
            lines.push(`  ${parts.join(' ')}`);
            if (g.rules?.length) {
                for (const r of g.rules.slice(0, 3)) {
                    lines.push(`    - ${r}`);
                }
                if (g.rules.length > 3) lines.push(`    - ... +${g.rules.length - 3} more rules`);
            }
        }
    }

    // --- Databases + Messaging + API (one-liner each) ---
    const infoParts = [];
    const db = config.databases;
    if (db) {
        if (db.primary) {
            const alts = db.alternatives?.length ? ` (+ ${db.alternatives.join(', ')})` : '';
            infoParts.push(`DB: ${db.primary}${alts}`);
        } else {
            const keys = Object.keys(db).filter(k => k !== 'note');
            if (keys.length) infoParts.push(`DB: ${keys.join(', ')}`);
        }
    }
    const msg = config.messaging;
    if (msg?.broker) infoParts.push(`Bus: ${msg.broker}`);
    const api = config.api;
    if (api?.style) infoParts.push(`API: ${api.style}${api.authPattern ? ` + ${api.authPattern}` : ''}`);
    if (infoParts.length) {
        lines.push('');
        lines.push(`**Stack:** ${infoParts.join(' | ')}`);
    }

    // --- Testing ---
    const test = config.testing;
    if (test?.frameworks?.length) {
        lines.push(`**Testing:** ${test.frameworks.join(', ')}${test.guideDoc ? ` → ${test.guideDoc}` : ''}`);
    }
    if (test?.integrationRules?.length) {
        lines.push('  **Integration Test Rules:**');
        for (const r of test.integrationRules.slice(0, 3)) {
            lines.push(`    - ${r}`);
        }
        if (test.integrationRules.length > 3) {
            lines.push(`    - ... +${test.integrationRules.length - 3} more rules`);
        }
    }

    // --- Infrastructure ---
    const infra = config.infrastructure;
    if (infra) {
        const parts = [];
        if (infra.containerization) parts.push(infra.containerization);
        if (infra.orchestration) parts.push(infra.orchestration);
        if (parts.length) lines.push(`**Infra:** ${parts.join(' + ')}`);
    }

    // --- Workflow Patterns ---
    const wp = config.workflowPatterns;
    if (wp) {
        const wpParts = [];
        if (wp.architectureStyle) wpParts.push(`**Architecture:** ${wp.architectureStyle}`);
        if (wp.codeHierarchy) wpParts.push(`**Code Hierarchy:** ${wp.codeHierarchy}`);
        if (wp.cssMethodology) wpParts.push(`**CSS:** ${wp.cssMethodology}`);
        if (wp.stateManagement) wpParts.push(`**State:** ${wp.stateManagement}`);
        if (wp.crossModuleValidation) wpParts.push(`**Cross-Module Validation:** ${wp.crossModuleValidation}`);
        if (wpParts.length) {
            lines.push('');
            lines.push('**Workflow Patterns:**');
            for (const p of wpParts) lines.push(`  ${p}`);
        }
        if (wp.featureDocTemplate) lines.push(`**Feature Specs:** ${getSpecDocsPath()} (template: ${wp.featureDocTemplate})`);
        if (wp.reviewRulesDoc) lines.push(`**Review Rules:** ${wp.reviewRulesDoc}`);
    }

    return lines.join('\n');
}

module.exports = {
    CONFIG_PATH,
    getConfiguredProjectConfigPath,
    getConfiguredDocsIndexPath,
    loadProjectConfig,
    buildRegexMap,
    buildPatternList,
    getModules,
    getContextGroup,
    getModuleForPath,
    resolveSection,
    getAllFileExtensions,
    getLocalizationConfig,
    isMultilingualProject,
    isConfigPopulated,
    isKnowledgePath,
    getKnowledgeRoot,
    generateProjectSummary,
    PORTABILITY_TOKENS,
    resolvePortabilityToken,
    resolvePortabilityTokens,
    getSpecDocsPath,
    getTechnicalSpecDocsPath,
    getDocsRoot
};
