import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const normalizeEol = text => text.replace(/\r\n/g, '\n');

test('TC-WFPROTO-005: redundant why-review sweep preserves changes-review validation gate', async () => {
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
                        'changes-review': {
                            sequence: [
                                'changes-review',
                                'why-review',
                                'security-review',
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
                '**Steps:** /changes-review -> /why-review -> /security-review -> /why-review -> /docs-update',
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
            workflowConfig.workflows['changes-review'].sequence,
            ['changes-review', 'why-review', 'security-review', 'docs-update'],
            'sweep must preserve changes-review -> why-review while removing a redundant control pair'
        );

        const skillText = normalizeEol(await fs.readFile(path.join(tempSkillDir, 'SKILL.md'), 'utf8'));
        assert.match(skillText, /\/changes-review -> \/why-review -> \/security-review -> \/docs-update/);
        assert.doesNotMatch(skillText, /\/security-review -> \/why-review/);
    } finally {
        await fs.rm(tempRoot, { recursive: true, force: true });
    }
});

test('TC-WFPROTO-007: prompt surfaces do not retain stale review workflow guidance', async () => {
    const promptSurfacePaths = [
        '.claude/workflows.json',
        '.claude/workflows/primary-workflow.md',
        '.claude/skills/architecture-review/SKILL.md',
        '.claude/skills/ui-review/SKILL.md',
        '.agents/skills/architecture-review/SKILL.md',
        '.agents/skills/ui-review/SKILL.md',
        '.codex/CODEX_CONTEXT.md',
        'AGENTS.md'
    ];
    const obsoleteWorkflowSummary = /code-simplifier\s*(?:->|→|\+)\s*changes-review\s*(?:->|→|\+)\s*architecture-review\s*(?:->|→|\+)\s*code-review\s*(?:->|→|\+)\s*performance/;
    const obsoleteReviewUiSibling = /(?:ui-review[`$]?[^.\n]*parallel-batch sibling|Sibling of [`$]?architecture-review)/;

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
            `${promptSurfacePath} must not describe ui-review as an external sibling reviewer`
        );
    }
});

test('TC-WFPROTO-008: review workflow batch prompt uses canonical skill ids and specialized agent types', async () => {
    const workflowText = normalizeEol(await fs.readFile(path.join(repoRoot, '.claude', 'workflows.json'), 'utf8'));
    const skillText = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.claude', 'skills', 'workflow-review-changes', 'SKILL.md'), 'utf8')
    );
    const combined = `${workflowText}\n${skillText}`;

    assert.doesNotMatch(combined, /`performance`, `integration-test-review`, `security`/);
    assert.doesNotMatch(combined, /Agent\(security,/);
    assert.doesNotMatch(combined, /subagent_type(?:`|":\s*)\s*`?code-reviewer`?[^.\n]*Steps 3[–-]7/);
    assert.match(combined, /`performance-review`, `integration-test-review`, `security-review`/);
    assert.match(combined, /Agent\(security-review, subagent_type="security-auditor"/);
    assert.match(combined, /Agent\(architecture-review, subagent_type="architect"/);
});

test('TC-WFADV-022: whole-target why-review starts in parallel with changes-review and preserves the final gate', async () => {
    const workflows = JSON.parse(
        await fs.readFile(path.join(repoRoot, '.claude', 'workflows.json'), 'utf8')
    ).workflows;
    const workflow = workflows['workflow-review-changes'];
    const skillText = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.claude', 'skills', 'workflow-review-changes', 'SKILL.md'), 'utf8')
    );
    const codexContextText = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.codex', 'CODEX_CONTEXT.md'), 'utf8')
    );
    // The outer zero-fix loop lives in workflow-review-changes as its delimited optional `--fix-loop` mode.
    const loopSkillText = skillText.match(/<!-- FIX-LOOP-MODE:START -->[\s\S]*?<!-- FIX-LOOP-MODE:END -->/)?.[0] ?? '';
    const workflowVerifierText = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.claude', 'scripts', 'codex', 'verify-workflow-cycle-compliance.mjs'), 'utf8')
    );

    assert.deepEqual(
        workflow.sequence.slice(0, 2).map((occurrence) =>
            typeof occurrence === 'string'
                ? occurrence
                : `${occurrence.skill}${occurrence.args ? ` ${occurrence.args}` : ''}`
        ),
        ['changes-review', 'why-review --target=whole-review-target'],
        'initial whole-target review must be a distinct sequence occurrence before the specialist batch'
    );
    assert.ok(
        !workflow.sequence.some((occurrence) =>
            typeof occurrence === 'object' && occurrence.id === 'findings-validation'
        ),
        'the separate findings-validation step must be removed'
    );
    assert.deepEqual(
        workflow.parallelGroups.find(group => group.id === 'initial-reviews'),
        {
            id: 'initial-reviews',
            members: ['initial-changes-review', 'why-review --target=whole-review-target'],
            conditionalMembers: [],
            barrier: true
        },
        'changes-review and whole-target why-review must share an unconditional all-return barrier'
    );
    assert.deepEqual(
        workflow.stepMeta['initial-changes-review'],
        { executionMode: 'inline' },
        'the initial changes-review occurrence remains inline while whole-target why-review runs out-of-band'
    );
    assert.deepEqual(
        workflow.sequence.slice(-6).map((occurrence) =>
            typeof occurrence === 'string'
                ? occurrence
                : `${occurrence.skill}${occurrence.args ? ` ${occurrence.args}` : ''}`
        ),
        ['why-review', 'experience-review', 'scan --target=domain-entities', 'docs-update', 'workflow-end', 'watzup'],
        'the conditional post-fix holistic why-review must precede optional experience evidence and terminal documentation sync'
    );
    const postFixWhyReview = workflow.sequence.find((occurrence) =>
        typeof occurrence === 'object' && occurrence.id === 'why-review'
    );
    assert.ok(
        postFixWhyReview && postFixWhyReview.applicability && postFixWhyReview.applicability.when && postFixWhyReview.applicability.skipReason,
        'the post-fix why-review must be conditional on the fix cycle having changed files'
    );
    assert.ok(
        !workflow.sequence.some((occurrence) =>
            typeof occurrence === 'object' && occurrence.id === 'final-changes-review'
        ),
        'the inline changes-review re-review step must be removed'
    );
    assert.match(skillText, /Initial Parallel Phase \(Steps 1[–-]2\)/);
    assert.match(skillText, /fresh `code-reviewer` sub-agent[^\n]*FULL mode/);
    assert.match(skillText, /Advance only after BOTH return/);
    assert.match(skillText, /step 14[^\n]*settled[^\n]*whole target/i);
    assert.match(
        codexContextText,
        /plan-execute -> why-review -> experience-review -> scan --target=domain-entities -> docs-update/,
        'generated guidance must preserve the conditional post-fix why-review occurrence and optional experience evidence'
    );
    assert.match(loopSkillText, /full 19-step sequence/);
    assert.doesNotMatch(loopSkillText, /full (?:20|21)-step sequence/);
    assert.match(loopSkillText, /fix cycle, steps 11[–-]14/);
    assert.doesNotMatch(loopSkillText, /fix cycle, steps 12[–-]15/);
    assert.doesNotMatch(
        loopSkillText,
        /workflow-review-changes\/SKILL\.md:\d/,
        'loop protocol must use stable named-section references instead of shifted line coordinates'
    );
    assert.match(workflowVerifierText, /step-14 re-review is inline by design/);
    assert.doesNotMatch(workflowVerifierText, /step-15 re-review is inline by design/);
});

// Given the outer zero-fix convergence loop is an OPTIONAL `--fix-loop` mode of workflow-review-changes
// (not a separate skill), When its documentation is read, Then the flag is advertised at the top and bottom,
// the mode is delimited, and every gate that makes the outer loop safe is present — so dropping one gate,
// recursing the flag into each round, or re-introducing the retired standalone loop skill fails here.
// Built from parts so the residue grep for the retired id stays at zero hits in canonical sources.
const RETIRED_LOOP_SKILL = ['workflow-review-changes', 'loop'].join('-');

function assertFixLoopMode(text) {
    const mode = text.match(/<!-- FIX-LOOP-MODE:START -->([\s\S]*?)<!-- FIX-LOOP-MODE:END -->/)?.[1] ?? '';
    assert.equal(text.split('<!-- FIX-LOOP-MODE:START -->').length - 1, 1, 'exactly one delimited --fix-loop mode section');
    assert.match(text, /^description: '[^'\n]*Flag: --fix-loop[^'\n]*'$/m, 'frontmatter description advertises the flag');
    const quickSummary = text.slice(text.indexOf('## Quick Summary'), text.indexOf('## First Principle'));
    assert.match(quickSummary, /\*\*`--fix-loop` \(OPTIONAL mode flag — absent by default, and absence changes nothing in this skill\):\*\*/);
    const closing = text.slice(text.lastIndexOf('## Closing Reminders'));
    assert.match(closing, /\*\*IMPORTANT MUST ATTENTION `--fix-loop` \(OPTIONAL mode — only when the flag is passed\):\*\*/);
    // Key gates carried from the retired loop protocol.
    assert.match(mode, /Converge a review scope to a \*\*clean no-op pass\*\*/);
    assert.match(mode, /invoke `\/workflow-review-changes` \(default mode, WITHOUT `--fix-loop`\) via the `Skill` tool \(NEVER the `Agent` tool\)/);
    assert.match(mode, /Scope base is FIXED across rounds; the working tree grows\./);
    assert.match(mode, /git diff develop\.\.\.HEAD/);
    assert.match(mode, /Snapshot before:\*\* record the working-tree fingerprint/);
    assert.match(mode, /working tree is byte-identical to the before-snapshot/);
    assert.match(mode, /Resolve\/create the Goal Contract/);
    assert.match(mode, /\*\*1\. Protocol loop — ALWAYS binding \(hook\/command-independent\)\.\*\*/);
    assert.match(mode, /\*\*2\. `\/goal` command — invoke as an accelerator WHEN AVAILABLE\.\*\*/);
    assert.match(mode, /\/goal accelerator unavailable — loop bound by protocol/);
    assert.match(mode, /\*\*Nested gates \(by design, safe\):\*\*/);
    assert.match(mode, /\*\*in this order — the first matching row decides\*\*/);
    assert.match(mode, /Why this mode exists \(READ FIRST/);
    assert.match(mode, /Fix-Loop Convergence Detection — Why Two Conditions/);
    assert.match(mode, /REGENERATE a fresh round task plan/);
    assert.ok(!text.includes(RETIRED_LOOP_SKILL), 'no reference to the retired standalone loop skill');
}

test('TC-WFADV-023: workflow-review-changes documents the optional --fix-loop outer convergence mode with its gates', async () => {
    const skillText = normalizeEol(
        await fs.readFile(path.join(repoRoot, '.claude', 'skills', 'workflow-review-changes', 'SKILL.md'), 'utf8')
    );
    assertFixLoopMode(skillText);
    await assert.rejects(
        fs.access(path.join(repoRoot, '.claude', 'skills', RETIRED_LOOP_SKILL)),
        'the standalone loop skill stays merged into the --fix-loop mode'
    );
    for (const [before, after] of [
        ['(default mode, WITHOUT `--fix-loop`) via the `Skill` tool (NEVER the `Agent` tool)', 'via the `Agent` tool'],
        ['working tree is byte-identical to the before-snapshot', 'reviews look clean'],
        ['**in this order — the first matching row decides**', 'using any matching row'],
        ['Scope base is FIXED across rounds; the working tree grows.', 'Scope is recomputed freely.'],
        ['<!-- FIX-LOOP-MODE:END -->', ''],
    ]) {
        assert.ok(skillText.includes(before), `mutation anchor exists: ${before}`);
        assert.throws(() => assertFixLoopMode(skillText.replaceAll(before, after)), { code: 'ERR_ASSERTION' });
    }
    assert.throws(() => assertFixLoopMode(`${skillText}\nSee /${RETIRED_LOOP_SKILL}.`), { code: 'ERR_ASSERTION' });
});

test('TC-WFADV-021: parallelGroups structural guards reject malformed barrier configs (no silent false-pass)', async () => {
    const { checkParallelGroupsStructure } = await import(
        pathToFileURL(path.join(repoRoot, '.claude', 'scripts', 'codex', 'verify-workflow-cycle-compliance.mjs')).href
    );
    const sequence = ['a', 'b', 'c', 'd'];
    const collect = workflow => {
        const failures = [];
        checkParallelGroupsStructure('wf', workflow, sequence, failures);
        return failures;
    };

    // A well-formed group must pass silently (no false-positive).
    assert.deepEqual(
        collect({ parallelGroups: [{ id: 'reviewers', members: ['a', 'b'], barrier: true, conditionalMembers: ['b'] }] }),
        [],
        'well-formed parallel group must produce zero structural failures'
    );

    // present-but-non-array parallelGroups must FAIL, not be silently treated as "no groups".
    const nonArray = collect({ parallelGroups: { id: 'x', members: ['a', 'b'], barrier: true } });
    assert.ok(
        nonArray.some(f => /must be an array/.test(f)),
        'non-array parallelGroups must be flagged'
    );

    // a group without a usable id must FAIL — the mirror renderers dedup by id, so a missing id
    // would silently drop the barrier token from the rendered mirror.
    const missingId = collect({ parallelGroups: [{ members: ['a', 'b'], barrier: true }] });
    assert.ok(
        missingId.some(f => /non-empty string id/.test(f)),
        'group missing a string id must be flagged'
    );

    // duplicate group ids must FAIL — renderer dedup would collapse them to one token.
    const dupId = collect({
        parallelGroups: [
            { id: 'dup', members: ['a', 'b'], barrier: true },
            { id: 'dup', members: ['c', 'd'], barrier: true }
        ]
    });
    assert.ok(
        dupId.some(f => /duplicate group id/.test(f)),
        'duplicate group id must be flagged'
    );
});

test('TC-HARNESS-006: review consumers name the executable canonical policy', async () => {
    const shared = normalizeEol(await fs.readFile(
        path.join(repoRoot, '.claude', 'skills', 'shared', 'sync-inline-versions.md'), 'utf8'
    ));
    const policy = await import(pathToFileURL(path.join(repoRoot, '.claude', 'scripts', 'lib', 'review-policy.cjs')).href);
    assert.match(shared, /## SYNC:review-policy/);
    assert.match(shared, /blockingFindings\(round, findings, hardGates\)/);
    assert.equal(policy.MAX_ROUNDS, 2);
    assert.deepEqual(
        policy.blockingFindings(2, [{ id: 'low', severity: 'LOW' }]),
        [],
        'round-two LOW floor must be executable, not merely prose'
    );
    assert.equal(
        policy.blockingFindings(2, [], [{ id: 'tests', status: 'FAIL' }]).length,
        1,
        'binary gates remain blocking at the LOW floor'
    );
});
