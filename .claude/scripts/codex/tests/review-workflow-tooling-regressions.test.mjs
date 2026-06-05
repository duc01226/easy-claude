import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const normalizeEol = text => text.replace(/\r\n/g, '\n');

test('TC-WFPROTO-005: redundant why-review sweep preserves review-changes validation gate', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'wfproto-sweep-'));
    try {
        const tempScriptDir = path.join(tempRoot, '.claude', 'scripts');
        const tempSkillDir = path.join(tempRoot, '.claude', 'skills', 'workflow-test');
        await fs.mkdir(tempScriptDir, { recursive: true });
        await fs.mkdir(tempSkillDir, { recursive: true });

        await fs.copyFile(
            path.join(repoRoot, '.claude', 'scripts', 'sweep-redundant-why-review.py'),
            path.join(tempScriptDir, 'sweep-redundant-why-review.py')
        );

        await fs.writeFile(
            path.join(tempRoot, '.claude', 'workflows.json'),
            JSON.stringify(
                {
                    workflows: {
                        'review-changes': {
                            sequence: [
                                'review-changes',
                                'why-review',
                                'security',
                                'why-review',
                                'docs-update'
                            ]
                        }
                    }
                },
                null,
                2
            ),
            'utf8'
        );

        await fs.writeFile(
            path.join(tempSkillDir, 'SKILL.md'),
            [
                '# Workflow Test',
                '',
                '**Steps:** /review-changes -> /why-review -> /security -> /why-review -> /docs-update',
                ''
            ].join('\n'),
            'utf8'
        );

        await execFileAsync('python', [path.join(tempScriptDir, 'sweep-redundant-why-review.py'), '--apply'], {
            cwd: tempRoot
        });

        const workflowConfig = JSON.parse(
            await fs.readFile(path.join(tempRoot, '.claude', 'workflows.json'), 'utf8')
        );
        assert.deepEqual(
            workflowConfig.workflows['review-changes'].sequence,
            ['review-changes', 'why-review', 'security', 'docs-update'],
            'sweep must preserve review-changes -> why-review while removing a redundant control pair'
        );

        const skillText = normalizeEol(await fs.readFile(path.join(tempSkillDir, 'SKILL.md'), 'utf8'));
        assert.match(skillText, /\/review-changes -> \/why-review -> \/security -> \/docs-update/);
        assert.doesNotMatch(skillText, /\/security -> \/why-review/);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('TC-WFPROTO-006: common protocol instructions are reproducible from workflow generator', async () => {
    const generator = require(path.join(repoRoot, '.claude', 'scripts', 'sync-copilot-workflows.cjs'));
    const workflowConfig = JSON.parse(
        await fs.readFile(path.join(repoRoot, '.claude', 'workflows.json'), 'utf8')
    );
    const generated = normalizeEol(generator.generateCommonProtocolFile(workflowConfig));
    const tracked = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.github', 'instructions', 'common-protocol.instructions.md'), 'utf8')
    );

    assert.equal(tracked, generated, 'tracked common protocol file must match generator output');

    const workflow = workflowConfig.workflows['review-changes'];
    const commandMapping = workflowConfig.commandMapping || {};
    const arrow = '\u2192';
    const expectedSequence = workflow.sequence
        .map(step => commandMapping[step]?.copilot || step)
        .join(` ${arrow} `);
    const sectionStart = tracked.indexOf('**review-changes**');
    assert.notEqual(sectionStart, -1, 'generated workflow catalog must include review-changes');
    const nextSectionStart = tracked.indexOf('\n**', sectionStart + 1);
    const reviewChangesSection = tracked.slice(
        sectionStart,
        nextSectionStart === -1 ? undefined : nextSectionStart
    );
    const stepsLine = reviewChangesSection
        .split('\n')
        .find(line => line.trim().startsWith('Steps:'));

    assert.match(reviewChangesSection, new RegExp(`Steps: ${expectedSequence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.ok(stepsLine, 'generated review-changes section must include a Steps line');
    assert.ok(!workflow.sequence.includes('plan-validate'), 'review-changes workflow must not include plan-validate');
    assert.doesNotMatch(stepsLine, /plan-validate/);
    assert.doesNotMatch(stepsLine, /review-ui/);
    assert.ok(
        !stepsLine.includes(`code-simplifier ${arrow} code-review ${arrow} integration-test-verify`),
        'code-review must not be a separate workflow-level step after code-simplifier'
    );
});

test('TC-WFPROTO-007: prompt surfaces do not retain stale review workflow guidance', async () => {
    const promptSurfacePaths = [
        '.claude/workflows.json',
        '.claude/workflows/primary-workflow.md',
        '.claude/skills/review-architecture/SKILL.md',
        '.claude/skills/review-ui/SKILL.md',
        '.agents/skills/review-architecture/SKILL.md',
        '.agents/skills/review-ui/SKILL.md',
        '.github/instructions/common-protocol.instructions.md',
        '.codex/CODEX_CONTEXT.md',
        'AGENTS.md'
    ];
    const obsoleteWorkflowSummary = /code-simplifier\s*(?:->|→|\+)\s*review-changes\s*(?:->|→|\+)\s*review-architecture\s*(?:->|→|\+)\s*code-review\s*(?:->|→|\+)\s*performance/;
    const obsoleteReviewUiSibling = /(?:review-ui[`$]?[^.\n]*parallel-batch sibling|Sibling of [`$]?review-architecture)/;

    for (const promptSurfacePath of promptSurfacePaths) {
        const text = normalizeEol(await fs.readFile(path.join(repoRoot, promptSurfacePath), 'utf8'));
        assert.doesNotMatch(
            text,
            obsoleteWorkflowSummary,
            `${promptSurfacePath} must not describe workflow-review-changes with obsolete child-step internals`
        );
        assert.doesNotMatch(
            text,
            obsoleteReviewUiSibling,
            `${promptSurfacePath} must not describe review-ui as an external sibling reviewer`
        );
    }
});
