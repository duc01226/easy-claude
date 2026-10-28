'use strict';

/**
 * The documents whose `<!-- COUNT:kind -->` regions (ADR-0002) the sync's `counts` stage fills and the
 * count-drift suite checks. One list for both, so a new count-bearing document is one edit here.
 *
 * Only listed files are rewritten: decision records quote example markers that must stay as written.
 * A listed file that is absent, or that carries no marker (an adopting project's own README), is left
 * alone by both owners.
 */

const path = require('node:path');

const ROOT_FILES = Object.freeze([
    'CLAUDE.md',
    'README.md',
    '.claude/docs/README.md',
    '.claude/docs/claude-ai-agent-framework-guide.md',
    '.claude/docs/hooks/README.md',
    '.claude/docs/skills/README.md',
    '.claude/docs/team-collaboration-guide.md',
    '.claude/docs/universal-setup-guide.md'
]);

/** File names under the configured project-reference root (`docsRoots.projectReference.path`). */
const REFERENCE_FILES = Object.freeze([
    'project-structure-reference.md',
    'docs-index-reference.md'
]);

/** The project-reference root as a project-relative, forward-slash path; the loader owns the default. */
function referenceRoot(projectDir) {
    const loader = require(path.join(__dirname, '..', '..', 'hooks', 'lib', 'project-config-loader.cjs'));
    let config = {};
    try {
        config = loader.readProjectConfigAt(projectDir).config || {};
    } catch {
        config = {};
    }
    return loader.getDocsRoot('projectReference', config).replace(/\\/g, '/').replace(/\/+$/, '');
}

/** Count-bearing documents of `projectDir`, project-relative with forward slashes, in a stable order. */
function countMarkerFiles(projectDir) {
    const reference = referenceRoot(projectDir);
    return [...ROOT_FILES, ...REFERENCE_FILES.map(name => `${reference}/${name}`)];
}

module.exports = { countMarkerFiles };
