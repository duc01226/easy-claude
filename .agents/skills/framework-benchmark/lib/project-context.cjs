'use strict';

const { safeRelative, fingerprint, projectInstruction, runtimeControl } = require('./files.cjs');
const { validateConfig } = require('../../../hooks/lib/project-config-schema.cjs');
const { DEFAULT_PORTABILITY } = require('../../../hooks/lib/ck-config-loader.cjs');
const { getDocsRoot } = require('../../../hooks/lib/project-config-loader.cjs');

function projectContext(entries, spec, installation = entries) {
    const byPath = new Map(entries.map(row => [row.path, row]));
    const installed = new Map(installation.map(row => [row.path, row]));
    const settings = installed.has('.claude/.ck.json') ? JSON.parse(installed.get('.claude/.ck.json').data.toString('utf8')) : {};
    const configPath = safeRelative(settings.portability?.projectConfigPath || DEFAULT_PORTABILITY.projectConfigPath);
    if (spec.projectConfigPath && safeRelative(spec.projectConfigPath) !== configPath) throw new Error('Case projectConfigPath conflicts with the selected framework portability owner');
    const configuration = byPath.has(configPath) ? JSON.parse(byPath.get(configPath).data.toString('utf8')) : null;
    if (configuration && !validateConfig(configuration).valid) throw new Error('Committed project config is malformed; cannot compare its setup faithfully');
    const referenceRoot = safeRelative(getDocsRoot('projectReference', configuration || {}));
    const roots = [...new Set([configPath, referenceRoot, getDocsRoot('projectReference', {}), 'CLAUDE.md', 'AGENTS.md', 'AGENTS.override.md', 'GEMINI.md', ...entries.filter(row => projectInstruction(row.path)).map(row => row.path)])];
    // A relocated always-on owner is part of the treatment even when outside the reference-docs root.
    for (const key of ['docsIndexPath', 'lessonsPath']) if (settings.portability?.[key]) roots.push(safeRelative(settings.portability[key]));
    if (roots.some(root => runtimeControl(root) && !projectInstruction(root) && !/(?:^|\/)\.claude\/docs(?:\/|$)/i.test(root))) throw new Error('Project context owners cannot overlap immutable framework controls');
    const isContext = file => roots.some(root => file === root || file.startsWith(`${root}/`));
    const context = entries.filter(row => isContext(row.path));
    if (spec.projectMode === 'brownfield-configured' && (!configuration || !context.some(row => row.path.startsWith(`${referenceRoot}/`)))) {
        throw new Error('Configured comparison requires a committed project config and reference docs; select brownfield-bootstrap to measure creating them');
    }
    return { roots, configPath, referenceRoot, entries: context, hash: fingerprint(context), isContext };
}

function treatmentInstruction(spec) {
    const setup = spec.projectMode === 'greenfield'
        ? 'Start with the installed workflow-greenfield-init workflow for the new project, including project configuration, reference documents, planning and scaffolding. Continue to the implementation needed to satisfy the complete task brief; do not stop at a plan or scaffold.'
        : spec.projectMode === 'brownfield-bootstrap'
            ? 'First run the installed project-init skill against this existing project to create its project configuration and project reference documents from the actual code. Then use that setup throughout the requested task. Setup work is part of this task.'
            : 'Use the installed project configuration and project reference documents together with the skills, hooks and workflow. Refresh them through their owning skills only when the task makes them stale.';
    return `${setup}\n${spec.treatment}`;
}

function expectedSkills(spec) {
    return [...new Set([...(spec.projectMode === 'greenfield' ? ['workflow-greenfield-init'] : spec.projectMode === 'brownfield-bootstrap' ? ['project-init'] : []), ...spec.expectedSkills])];
}

module.exports = { projectContext, treatmentInstruction, expectedSkills };
