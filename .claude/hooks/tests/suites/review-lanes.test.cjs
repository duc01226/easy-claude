'use strict';

/**
 * Review lanes — intent guards for the whole-diff correctness lane and lean leaf reviewers.
 *
 * Business intent guarded:
 *   lane       a behavior-changing diff is also read ONCE as one change, so defects that span files
 *              (a flow crossing layers, a boundary such as time crossing a day) stay visible even when
 *              batches split the diff by module; only calibrated, reachable findings are kept.
 *   reach      the lane reaches every executor: both orchestrating review skills and the reviewer agent.
 *   one reader the whole change is read once — by the orchestrator, else by a reviewer that already reads
 *              the whole target, a dedicated lane only when none has room — never twice.
 *   check set  in-batch validation keeps an independent main-session check that also sees what a batch
 *              rejected or demoted, and anything a batch could not validate.
 *   lean leaf  a dispatched reviewer agent carries no review-loop orchestration protocol — the
 *              orchestrating skill owns batching, the round loop, reviewer prompts and the round
 *              record; copying them into every leaf re-loads ~11k tokens per spawn for no work.
 * All tests read this repo's shipped carriers, so they run only in the framework repo.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const { isFrameworkRepo } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'framework-repo-guard.cjs'));

const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'reads the framework repo\'s own shipped carriers (framework-repo signal)';
const LANE = 'whole-diff-correctness';
const ORCHESTRATION = ['review-protocol-injection', 'systematic-review-batching', 'double-round-trip-review', 'fresh-context-review', 'review-policy'];
// The leaf rules the reviewer template embeds. Agents that held the template before it left agent files are
// dispatched directly too, so each keeps every one of these as its own block on every harness.
const TEMPLATE_LEAF_TAGS = ['spec-tests-code-triangulation', 'evidence-based-reasoning', 'bug-detection', 'design-patterns-quality', 'logic-and-intention-review', 'test-spec-verification', 'behavioral-delta-matrix', 'fix-layer-accountability', 'rationalization-prevention', 'graph-assisted-investigation', 'understand-code-first'];
const TEMPLATE_LEAF_AGENTS = ['code-reviewer', 'integration-tester', 'planner', 'spec-compliance-reviewer'];

function read(...segments) {
    return fs.readFileSync(path.join(REPO_ROOT, ...segments), 'utf8').replace(/\r\n?/g, '\n');
}

function canonicalBody(tag) {
    const canonical = read('.claude', 'skills', 'shared', 'sync-inline-versions.md');
    const start = canonical.indexOf(`## SYNC:${tag}\n`);
    assert.notEqual(start, -1, `canonical SYNC:${tag} exists`);
    return canonical.slice(start, canonical.indexOf('\n---\n', start));
}

const tests = [
    {
        name: '[review-lanes] TC-RL-001 the lane reads the whole change once, splits only by flow, hunts real situations and keeps only calibrated findings',
        skip: SKIP,
        fn: () => {
            const lane = canonicalBody(LANE);
            assert.match(lane, /complete behavior-changing diff[^.]*as a single change/, 'reads the whole change once');
            assert.match(lane, /along the change's own flows, never by file type/, 'a split keeps whole scenarios together');
            assert.match(lane, /never replace this pass/, 'batches and specialists never replace it');
            assert.match(lane, /time crossing a day or time zone/, 'hunts time boundaries');
            assert.match(lane, /alternate clients, roles, channels and states/, 'hunts alternate clients and roles');
            assert.match(lane, /blame, recent commits/, 'uses change history as recorded intent');
            assert.match(lane, /keep what reaches 85/, 'keeps only confirmed findings');
            assert.match(lane, /Rarity and impact set severity, never confidence/, 'a confirmed rare defect is still reported');
            // An unsettled MEDIUM-or-higher candidate takes the severity-rubric route, never a silent drop.
            assert.match(lane, /never silently dropped when its consequence would be MEDIUM or higher: report it as `NOT VERIFIABLE`, naming what would settle it/,
                'an unsettled MEDIUM+ candidate is reported NOT VERIFIABLE');
            assert.match(canonicalBody(`${LANE}:reminder`), /MEDIUM or higher as `NOT VERIFIABLE`[^.]*never dropped/,
                'the lane reminder keeps the NOT VERIFIABLE route');
            assert.match(canonicalBody('severity-rubric'), /the concern would be MEDIUM or higher, emit `NOT VERIFIABLE` naming what would settle it/,
                'the lane route agrees with the severity rubric it defers to');
            assert.match(lane, /It is one assignment/, 'batch and specialist reviewers do not each re-read the whole diff');
            // The shared "never a finding" rule has one owner, and the lane points at it.
            assert.match(lane, /defined once in `SYNC:severity-rubric`/);
            const rubric = canonicalBody('severity-rubric');
            for (const excluded of [/test run for this change already reports in the review evidence/, /stated intent asks for/, /suppression that predates this change/, /neither touched nor made reachable/]) {
                assert.match(rubric, excluded, `severity-rubric excludes ${excluded}`);
            }
            // A change can never exempt itself: a suppression it adds is reviewed like any other line.
            assert.match(rubric, /a suppression the change adds is itself reviewed/);
        }
    },
    {
        name: '[review-lanes] TC-RL-002 the lane reaches both orchestrating review skills and the reviewer agent, and runs for every behavior-changing diff',
        skip: SKIP,
        fn: () => {
            for (const carrier of [['.claude', 'skills', 'changes-review', 'SKILL.md'], ['.claude', 'skills', 'workflow-review-changes', 'SKILL.md'], ['.claude', 'skills', 'code-quality-review', 'SKILL.md'], ['.claude', 'agents', 'code-reviewer.md']]) {
                const text = read(...carrier);
                assert.ok(text.includes(`<!-- SYNC:${LANE} -->`), `${carrier.join('/')} carries the lane`);
            }
            const changesReview = read('.claude', 'skills', 'changes-review', 'SKILL.md');
            assert.match(changesReview, /Whole-diff correctness \(every behavior-changing diff\)/);
            assert.match(changesReview, /otherwise the reviewer that already reads the whole target[^\n]*?; a dedicated lane only when neither has room/, 'the lane rides on an existing whole-target reader');
            assert.match(changesReview, /Batches add depth but never replace it/);
            assert.match(canonicalBody(LANE), /otherwise gives it to a reviewer that already reads the whole target, and to a dedicated reviewer only when none has room/);
            assert.match(read('.claude', 'workflows.json'), /otherwise by the whole-target sub-agent with the lane protocol in its brief, never by both/, 'the workflow never reads the whole change twice');
            assert.match(read('.claude', 'skills', 'workflow-review-changes', 'SKILL.md'), /also read whole once \(`SYNC:whole-diff-correctness`\)/);
            assert.match(read('.claude', 'skills', 'code-quality-review', 'SKILL.md'), /\*\*Whole-diff correctness\*\* \(every behavior-changing diff\)/);
        }
    },
    {
        name: '[review-lanes] TC-RL-003 dispatched reviewer agents carry no review-loop orchestration protocol',
        skip: SKIP,
        fn: () => {
            const agentsDir = path.join(REPO_ROOT, '.claude', 'agents');
            const agents = fs.readdirSync(agentsDir).filter(name => name.endsWith('.md'));
            assert.ok(agents.includes('code-reviewer.md') && agents.length > 10, 'the agent scan is non-vacuous');
            const leaks = [];
            for (const name of agents) {
                const text = fs.readFileSync(path.join(agentsDir, name), 'utf8');
                for (const tag of ORCHESTRATION) {
                    if (text.includes(`<!-- SYNC:${tag} -->`) || text.includes(`<!-- SYNC:${tag}:reminder -->`)) leaks.push(`${name}: ${tag}`);
                }
            }
            assert.deepEqual(leaks, [], `leaf agents must not carry review-loop orchestration:\n  ${leaks.join('\n  ')}`);
            // Digest lines outside the fences must not keep pointing at protocols a leaf no longer carries.
            const staleDigest = /^- \*\*(?:Systematic Batching|Fresh Context Review|Double Round-Trip Review|Review Protocol Injection):\*\*/m;
            const stale = agents.filter(name => staleDigest.test(fs.readFileSync(path.join(agentsDir, name), 'utf8')));
            assert.deepEqual(stale, [], `agent digests still name removed review-loop protocols: ${stale.join(', ')}`);
            // The template no longer reaches a directly dispatched reviewer (e.g. a bugfix review from `fix`), and
            // hosts without a skill preload render it as a pointer — so each former template holder keeps its leaf rules.
            const missing = [];
            for (const agent of TEMPLATE_LEAF_AGENTS) {
                const text = fs.readFileSync(path.join(agentsDir, `${agent}.md`), 'utf8');
                for (const tag of TEMPLATE_LEAF_TAGS) if (!text.includes(`<!-- SYNC:${tag} -->`)) missing.push(`${agent}: ${tag}`);
            }
            assert.deepEqual(missing, [], `reviewer agents lost template leaf rules:\n  ${missing.join('\n  ')}`);
            // The effective context counts: a skill an agent preloads (Claude `skills:` frontmatter) that carries
            // review-loop orchestration must tell a leaf that the loop belongs to its caller.
            let preloadsChecked = 0;
            let preloadingAgents = 0;
            for (const name of agents) {
                const front = fs.readFileSync(path.join(agentsDir, name), 'utf8').replace(/\r\n?/g, '\n').split('\n---\n')[0];
                const line = front.match(/^skills:\s*(.+)$/m);
                if (line) preloadingAgents += 1;
                for (const skill of line ? line[1].split(',').map(s => s.trim()).filter(Boolean) : []) {
                    const skillText = read('.claude', 'skills', skill, 'SKILL.md');
                    if (!ORCHESTRATION.some(tag => skillText.includes(`<!-- SYNC:${tag} -->`))) continue;
                    preloadsChecked += 1;
                    assert.match(skillText, /Dispatched as a leaf reviewer[^\n]*belong to your caller/, `${name} preloads ${skill}, which must bound a leaf reviewer`);
                }
            }
            // No reviewer agent preloads an orchestration-carrying skill by design (preloads were removed so a leaf never inherits a loop);
            // the boundary above still binds any future preload. Non-vacuous means the scan really parses agent frontmatter.
            assert.ok(preloadingAgents > 0, 'the effective-context check is non-vacuous: the scan reads agent skills: frontmatter');
        }
    },
    {
        name: '[review-lanes] TC-RL-004 the independent check set also sees what a batch rejected, demoted or could not validate',
        skip: SKIP,
        fn: () => {
            const batching = canonicalBody('systematic-review-batching');
            // A batch never silently drops a finding: rejections and re-tiers return with their original severity.
            assert.match(batching, /lists every finding it rejected or re-tiered with its original severity/);
            // The main session re-checks the high tier as raised, not only as the batch left it.
            assert.match(batching, /every finding raised or kept at CRITICAL\/HIGH, including one its batch rejected or demoted/);
            // A harness whose sub-agents cannot run the validator still validates everything once.
            assert.match(batching, /every finding its batch did not mark `validated: in-batch`/);
            assert.match(batching, /at least one in three of each batch's MEDIUM findings \(minimum one\), picked by position/);
            assert.match(batching, /more than one in four sampled findings rejected or re-tiered — validate all of that batch's MEDIUM findings/);
            // One owner: the workflow references the canonical check set instead of restating it.
            const workflow = read('.claude', 'skills', 'workflow-review-changes', 'SKILL.md');
            assert.doesNotMatch(workflow, /one in four findings sends|Above 40 findings/, 'workflow-review-changes restates the check set');
            // The brief lists that orchestrators build batch prompts from name the validation Step 2b relies on.
            assert.match(batching, /Each batch sub-agent receives: its full file list; the Step 2b instruction to validate its own findings/);
            assert.match(read('.claude', 'skills', 'changes-review', 'SKILL.md'), /for a batch the instruction to validate its own findings/);
        }
    },
    {
        name: '[review-lanes] TC-RL-005 agent count is sized by fixed load, and a moving target is caught before findings are trusted',
        skip: SKIP,
        fn: () => {
            // A sub-agent's standing cost includes every skill it loads, so a small lens folds into an agent already reading its files.
            const dispatch = canonicalBody('parallel-subagent-dispatch');
            assert.match(dispatch, /every skill it loads or preloads/);
            assert.match(dispatch, /commonly tens of thousands of tokens/);
            assert.match(dispatch, /fold it into an agent that already reads the same files as concrete questions/);
            // Folding never trades away depth that risk requires: a small high-risk change keeps its full specialist protocol.
            assert.match(dispatch, /unless the task's risk needs its full protocol: risk sets depth, file count never does/);
            // The closing reminder is the recency anchor agents act on, so it carries the same risk guard as the body.
            assert.match(canonicalBody('parallel-subagent-dispatch:reminder'), /fold a small lens into an agent already reading the same files, unless its risk needs the full protocol/);
            const workflow = read('.claude', 'skills', 'workflow-review-changes', 'SKILL.md');
            // The wave is sized before the per-specialist example; lenses shrink the agent count, never the checks.
            const sizing = workflow.indexOf('size the wave before you spawn it');
            const example = workflow.indexOf('Maximum shape, one agent per selected specialist');
            assert.ok(sizing !== -1 && example > sizing, 'wave sizing precedes the maximum-shape example');
            assert.match(workflow, /every lens and gate still runs, only the number of agents changes/);
            assert.match(workflow, /A `gate` specialist always runs its own skill/);
            // Another writer on the same tree turns findings and test failures into misattribution.
            assert.match(workflow, /confirm the target did not move under the run/);
        }
    }
];

module.exports = { name: 'review-lanes', tests };
