import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

async function read(relativePath) {
    return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

test('market-analysis template declares the knowledge-review citation contract (TC-PROMPT-001)', async () => {
    const template = await read('.claude/templates/market-analysis-template.md');
    const marketSkill = await read('.claude/skills/market-analysis/SKILL.md');
    const knowledgeReview = await read('.claude/skills/knowledge-review/SKILL.md');

    assert.match(template, /Every factual sentence, number, comparison, table item, and inference ends/);
    assert.match(template, /inline `\[N\]` citation mapped to one row in \*\*Sources\*\*/);
    assert.match(template, /\| # \| Title \| URL \| Author \/ Publisher \| Tier \| Date \| Used for \|/);
    assert.match(marketSkill, /Every factual claim, number, table row, and inference must end with an inline `\[N\]` citation/);
    assert.match(marketSkill, /Sources table must provide Title, URL, Author\/Publisher, Date, and Tier/);
    assert.match(knowledgeReview, /Sources table has: Title, URL, Author, Date, Tier/);
});

test('research workflow carries one market artifact identity through both consumers (TC-PROMPT-002)', async () => {
    const workflow = await read('.claude/skills/workflow-research/SKILL.md');
    const market = await read('.claude/skills/market-analysis/SKILL.md');
    const business = await read('.claude/skills/business-evaluation/SKILL.md');
    const strategy = await read('.claude/skills/strategy-builder/SKILL.md');

    assert.match(workflow, /ARTIFACT_SLUG/);
    assert.match(workflow, /MARKET_ANALYSIS_PATH = docs\/knowledge\/strategy\/market-analysis\/\{ARTIFACT_SLUG\}\.md/);
    assert.match(market, /parent-provided[\s\S]*ARTIFACT_SLUG[\s\S]*MARKET_ANALYSIS_PATH/);
    assert.match(business, /exact\s+parent-provided `MARKET_ANALYSIS_PATH`/);
    assert.match(strategy, /exact parent-provided[\s\S]*MARKET_ANALYSIS_PATH/);
    assert.match(strategy, /workflow artifact is missing[\s\S]*do not silently substitute inline context/);
    assert.doesNotMatch(strategy, /market-analysis skill or inline/);
    assert.match(strategy, /Unverified inline market context/);
});

test('business-evaluation summary matches its seven detailed steps and market prerequisite (TC-PROMPT-003)', async () => {
    const business = await read('.claude/skills/business-evaluation/SKILL.md');
    const headings = [...business.matchAll(/^## Step (\d+): (.+)$/gm)].slice(0, 7);

    assert.deepEqual(headings.map(match => match[1]), ['1', '2', '3', '4', '5', '6', '7']);
    assert.equal(headings.at(-1)?.[2], 'Verdict');
    assert.match(business, /Seven evaluation steps, preceded by a market-evidence precondition/);
    assert.match(business, /Precondition — load market analysis/);
    assert.match(business, /load market evidence first, then run ALL 7 evaluation steps in order/);
    assert.doesNotMatch(business, /^2\. \*\*Load market analysis\*\*/m);
    assert.doesNotMatch(business, /All 8 main steps|ALL 8 steps|All 7 main steps/);
});

test('demo template repeats the no-front-end exception at the story decision point (TC-PROMPT-004)', async () => {
    const skill = await read('.claude/skills/demo-guide/SKILL.md');
    const template = await read('.claude/skills/demo-guide/references/demo-guide-template.md');

    assert.match(skill, /under the no-front-end rung/);
    assert.match(template, /only when a front-end is present[\s\S]*under the no-front-end rung/);
    assert.match(template, /primary surface as the main[\s\S]*do not write this note/);
});

test('session recovery documentation and ignore rules match the OS-temp state owner (TC-PROMPT-005)', async () => {
    const todoState = await read('.claude/hooks/lib/todo-state.cjs');
    const workflowState = await read('.claude/hooks/lib/workflow-state.cjs');
    const maintainer = await read('.claude/agents/framework-maintainer.md');
    const workflowEnd = await read('.claude/skills/workflow-end/SKILL.md');
    const gitignore = await read('.gitignore');

    assert.match(todoState, /path\.join\(CK_TMP_DIR, 'todo'\)/);
    assert.match(workflowState, /path\.join\(CK_TMP_DIR, 'workflow'\)/);
    assert.match(maintainer, /OS-temp `CK_TMP_DIR` namespaces/);
    assert.match(workflowEnd, /CK_TMP_DIR\/workflow\/\{sessionId\}\.json/);
    assert.match(gitignore, /^\.claude\/.todo-state\.json$/m);
    assert.match(gitignore, /^\.claude\/.workflow-state\.json$/m);
});

test('active-plan and workflow-end prompts agree with live state ownership (TC-PROMPT-006)', async () => {
    const [presentation, accumulation, activePlan, workflowEnd] = await Promise.all([
        read('.claude/skills/feature-presentation/SKILL.md'),
        read('.claude/skills/feature-presentation/references/artifact-accumulation.md'),
        read('.claude/scripts/set-active-plan.cjs'),
        read('.claude/skills/workflow-end/SKILL.md'),
    ]);

    for (const content of [presentation, accumulation, activePlan]) {
        assert.match(content, /CK_TMP_DIR\/session\/(?:\{id\}|\{sessionId\})\.json/);
        assert.doesNotMatch(content, /\/tmp\/ck-session-\{id\}\.json/);
    }

    assert.match(workflowEnd, /per-session state is retained until explicit `\/clear`/);
    assert.doesNotMatch(workflowEnd, /clear-workflow-state/);
    assert.equal(
        (workflowEnd.match(/^\*\*IMPORTANT MANDATORY Steps:/gm) || []).length,
        1,
        'workflow-end must have one authoritative mandatory sequence',
    );
});

test('why-review council suppression resolves the project-owned workflow state (TC-PROMPT-007)', async () => {
    const whyReview = await read('.claude/skills/why-review/SKILL.md');
    const workflowState = await read('.claude/hooks/lib/workflow-state.cjs');

    assert.match(whyReview, /resolve the current `workflowId` from host-injected workflow context/);
    assert.match(whyReview, /CK_TMP_DIR\/workflow\/\{sessionId\}\.json/);
    assert.match(whyReview, /Never assume the legacy file exists/);
    assert.match(whyReview, /workflowId = unavailable/);
    assert.match(workflowState, /Storage: CK_TMP_DIR\/workflow\/\{sessionId\}\.json/);
});
