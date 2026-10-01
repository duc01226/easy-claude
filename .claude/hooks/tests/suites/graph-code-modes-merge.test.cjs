/**
 * Graph-Code Modes Merge Test Suite
 *
 * The `graph-code` skill owns five code-graph roles as modes: `--mode=build` (build, update or sync the
 * graph), `--mode=query` (relationship queries), `--mode=trace` (system-flow traces),
 * `--mode=blast-radius` (impact of the current changes) and `--mode=connect-api` (frontend-to-backend
 * API edges). Each mode body lives in `graph-code/references/mode-<x>.md`; `graph-code/SKILL.md` detects
 * the mode first and carries a BLOCKING "read the mode file in full FIRST" line per mode. The five modes
 * have no skill folder of their own. The python CLI and the graph hooks are not skills and stay as they
 * are.
 *
 * Coverage:
 *   TC-GCM-001 — mode detection sits at the top of SKILL.md; each of the five modes has its BLOCKING read
 *                line and an existing reference; the removed slash commands resolve through a "former" note.
 *   TC-GCM-002 — SKILL.md carries no mode body; every mode body lives in its reference file.
 *   TC-GCM-003 — build mode keeps the tooling-install Step 0 (mode check first, stop on failure), the three
 *                scopes with the auto-detect default, the sync-then-update chain and the no-op checkout rule.
 *   TC-GCM-004 — query mode keeps the intent mapping, the four response statuses and the query patterns.
 *   TC-GCM-005 — trace mode keeps the three directions, the bug/failure upstream-first rule and the flags.
 *   TC-GCM-006 — blast-radius mode keeps the live CLI run, the three risk bands and the recommendations;
 *                connect-api mode keeps the five matching strategies and the optional connector config.
 *   TC-GCM-007 — the graph is optional: SKILL.md states the advisory block once, names the absent-graph
 *                message, and no mode reference turns the graph into a gate for other work.
 *   TC-GCM-008 — the five old skill folders stay deleted, `graph-export` stays, no workflow step names a
 *                removed skill and the called-skill profile lists the new skill.
 *   TC-GCM-009 — the debugger-trace protocol is carried by SKILL.md (guide + reminder), never by a reference.
 *   TC-GCM-010 — the description keeps the `[Code Intelligence]` tag, the 250-character limit and names
 *                every mode.
 *   TC-GCM-011 — the prompt-gate hook routes the graph build to `/graph-code --mode=build`.
 *   TC-GCM-012 — no live source names a removed skill (allow-list: the "former" lines of SKILL.md; the CLI
 *                verbs `graph-blast-radius` and `graph-connect-api` are not skill names).
 *
 * Portability: every row asserts this framework repository's own skills, registry and hooks, so each is
 * skipped in any other project (framework-repo signal). Paths use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { resolveAllWorkflowManifests } = require('../../../scripts/lib/workflow-manifest.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own graph-code skill, registry and hooks (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const skill = () => read(SKILLS, 'graph-code', 'SKILL.md');
const mode = name => read(SKILLS, 'graph-code', 'references', `mode-${name}.md`);

const MODES = ['build', 'query', 'trace', 'blast-radius', 'connect-api'];
// The removed skill names, assembled so this file never contains the literal tokens it guards against.
const REMOVED = ['build', 'query', 'trace', 'blast-radius', 'connect-api'].map(suffix => 'graph' + '-' + suffix);

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/graph-code-modes-merge.test.cjs'
]);
const SCAN_EXCLUDED_DIRS = new Set(['node_modules', '.git', '.code-graph', 'tmp', 'temp', 'plans']);
const SCAN_EXTENSIONS = new Set(['.md', '.cjs', '.mjs', '.js', '.py', '.json', '.yaml', '.yml', '.toml']);

function* walk(rel) {
    const abs = path.join(REPO_ROOT, ...rel.split('/'));
    if (!fs.existsSync(abs)) return;
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
        if (SCAN_EXTENSIONS.has(path.extname(abs))) yield rel;
        return;
    }
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.isDirectory() && SCAN_EXCLUDED_DIRS.has(entry.name)) continue;
        yield* walk(`${rel}/${entry.name}`);
    }
}

const alternation = REMOVED.map(name => name.replace(/[-]/g, '\\-')).join('|');
// A removed skill is named as a slash command, as a skill path, or as a bare backticked skill name.
const SKILL_NAME_PATTERNS = [
    new RegExp(`(?<![\\w/.\\\\-])/(?:${alternation})(?![\\w/-])`),
    new RegExp(`skills/(?:${alternation})\\b`),
    new RegExp(`\`(?:${alternation})\``)
];

/** A line that names a removed skill but is an allowed mention. */
function allowedMention(rel, line) {
    return rel === '.claude/skills/graph-code/SKILL.md' && /former/i.test(line);
}

const tests = [
    {
        name: 'TC-GCM-001 graph-code detects the mode first and gives each of the five modes a BLOCKING read-first line and a reference file',
        skip: SKIP,
        fn: () => {
            const text = skill();
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            for (const name of MODES) {
                assert.match(text, new RegExp(`--mode=${name}`), `--mode=${name} is documented`);
                assert.match(text, new RegExp(`\\*\\*\\[BLOCKING\\]\\*\\* When \`--mode=${name}\`, read \`references/mode-${name}\\.md\` in full FIRST`), `mandatory read line for ${name}`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'graph-code', 'references', `mode-${name}.md`)), `references/mode-${name}.md exists`);
            }
            assert.match(text, /former `\/[a-z-]+`, `\/[a-z-]+`, `\/[a-z-]+`, `\/[a-z-]+` and `\/[a-z-]+`: those slash commands no longer exist/);
            // No mode and no matching intent shows the table instead of guessing
            assert.match(text, /never a guess/);
            // The Intent column holds ACTION phrases only: a prompt that merely names the graph ("show the code graph status") must not select
            // --mode=build, so the bare nouns are never a build trigger and the rule says a noun-only prompt gets the table
            const buildRow = text.split('\n').find((line) => line.startsWith('| `--mode=build'));
            assert.ok(buildRow, 'the dispatch table has a build row');
            // (the mode cell holds escaped pipes, so slice by the purpose/reference cells instead of splitting on `|`)
            const intents = buildRow.slice(buildRow.indexOf('Formerly `/graph-build`'), buildRow.indexOf('`references/mode-build.md`'));
            assert.ok(intents.length > 0 && buildRow.includes('`references/mode-build.md`'), 'the build row Intent cell was located');
            for (const action of ['"build graph"', '"sync graph"', '"update graph"', '"refresh graph after pull"']) assert.ok(intents.includes(action), `build intent keeps the action phrase ${action}`);
            for (const noun of ['"code graph"', '"knowledge graph"', '"uncommitted changes"']) assert.ok(!intents.includes(noun), `build intent must not list the bare noun ${noun}`);
            assert.match(text, /a prompt that merely names "code graph", "knowledge graph" or "uncommitted changes" carries no action and gets the table/);
        }
    },
    {
        name: 'TC-GCM-002 graph-code/SKILL.md does not carry a mode body and each body lives in its reference',
        skip: SKIP,
        fn: () => {
            const text = skill();
            const markers = {
                build: ['### Step 0 — Install the graph tooling', 'graph_ahead_skipped', '## DB Performance Indexes'],
                query: ['## Semantic Query Protocol', '## Available Query Patterns', 'status: "ambiguous"'],
                trace: ['## Edge Types Traced', '--edge-kinds KIND1,KIND2', '**Bug/failure rule:**'],
                'blast-radius': ['## Run the CLI Live', '**High risk:** >20 impacted nodes'],
                'connect-api': ['## Zero-Config Auto-Detection', '## Matching Strategies', '"graphConnectors"']
            };
            for (const [name, list] of Object.entries(markers)) {
                for (const marker of list) {
                    assert.ok(!text.includes(marker), `SKILL.md must not inline the ${name} body: ${marker}`);
                    assert.ok(mode(name).includes(marker), `mode-${name}.md holds ${marker}`);
                }
            }
        }
    },
    {
        name: 'TC-GCM-003 --mode=build keeps the install Step 0, the three scopes with the auto-detect default, the sync-then-update chain and the older-checkout no-op',
        skip: SKIP,
        fn: () => {
            const text = mode('build');
            const steps = text.slice(text.indexOf('## Steps'));
            const installAt = steps.indexOf('ensurePythonDeps');
            const firstGraphCallAt = steps.indexOf('python .claude/scripts/code_graph');
            assert.ok(installAt !== -1 && installAt < firstGraphCallAt, 'the tooling install precedes every graph CLI call');
            assert.match(steps.slice(steps.indexOf('### Step 0'), steps.indexOf('### Default')), /Non-zero exit:\*\*\s*stop\./, 'a failed install stops the build');
            assert.match(text, /code graph is off for this project \(hooks\.codeGraph\)/, 'the off message is kept');
            for (const scope of ['full', 'update', 'sync']) assert.match(text, new RegExp(`### \`--scope=${scope}\``), `--scope=${scope} branch`);
            assert.match(text, /Default \(no `--scope`\) auto-detects from `status`/);
            assert.match(text, /`sync --json` then `update --json`/);
            assert.match(text, /graph_ahead_skipped/);
            assert.match(text, /full_rebuild_fallback/);
        }
    },
    {
        name: 'TC-GCM-004 --mode=query keeps the intent mapping, the four response statuses and the query patterns',
        skip: SKIP,
        fn: () => {
            const text = mode('query');
            for (const pattern of ['callers_of', 'callees_of', 'imports_of', 'importers_of', 'children_of', 'tests_for', 'inheritors_of', 'file_summary']) {
                assert.ok(text.includes(`\`${pattern}\``), `query pattern ${pattern}`);
            }
            for (const status of ['ok', 'ambiguous', 'not_found', 'error']) assert.ok(text.includes(`status: "${status}"`), `status ${status}`);
            assert.match(text, /AskUserQuestion/, 'an ambiguous target is resolved with the user');
            for (const command of ['connections', 'batch-query', 'find-path', 'search']) assert.ok(text.includes(`code_graph ${command}`), `CLI ${command}`);
            assert.match(text, /Always use `--json` flag/);
        }
    },
    {
        name: 'TC-GCM-005 --mode=trace keeps the three directions, the bug/failure upstream-first rule and the CLI flags',
        skip: SKIP,
        fn: () => {
            const text = mode('trace');
            for (const direction of ['downstream', 'upstream', 'both']) assert.ok(text.includes(`\`${direction}\``), `direction ${direction}`);
            assert.match(text, /\*\*Bug\/failure rule:\*\* start with `upstream` or `both`/);
            for (const flag of ['--direction', '--depth', '--edge-kinds', '--node-mode', '--json']) assert.ok(text.includes(`\`${flag}\``), `flag ${flag}`);
            assert.match(text, /Don't trace with depth > 5/);
        }
    },
    {
        name: 'TC-GCM-006 --mode=blast-radius keeps the live run, risk bands and recommendations; --mode=connect-api keeps the matching strategies and config',
        skip: SKIP,
        fn: () => {
            const blast = mode('blast-radius');
            assert.match(blast, /python \.claude\/scripts\/code_graph blast-radius --json/);
            assert.match(blast, /\*\*Low risk:\*\* <5 impacted nodes/);
            assert.match(blast, /\*\*Medium risk:\*\* 5-20 impacted nodes/);
            assert.match(blast, /\*\*High risk:\*\* >20 impacted nodes/);
            assert.match(blast, /Flag untested changed functions/);
            assert.match(blast, /run the CLI yourself/);
            const api = mode('connect-api');
            for (const strategy of ['Exact match', 'Prefix-augmented', 'Suffix match', 'Deep strip', 'Deep strip both']) assert.ok(api.includes(strategy), `strategy ${strategy}`);
            assert.match(api, /python \.claude\/scripts\/code_graph connect-api --json/);
            assert.match(api, /"graphConnectors"/);
            assert.match(api, /Custom patterns \*\*extend\*\*/);
        }
    },
    {
        name: 'TC-GCM-007 the graph stays optional: one advisory block, a plain absent-graph message and no gate language in any mode',
        skip: SKIP,
        fn: () => {
            const text = skill();
            const advisory = 'Optional: when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module or cross-service flow, public API), the code graph (`.code-graph/graph.db`) can add callers, dependents and impacted tests. Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes.';
            assert.equal(text.split(advisory).length - 1, 1, 'the advisory block appears exactly once in SKILL.md');
            assert.match(text, /Nothing in this skill is mandatory for other skills or workflows/);
            const absent = 'graph not built — run /graph-code --mode=build, or continue with grep';
            assert.ok(text.includes(absent), 'SKILL.md names the absent-graph message');
            for (const name of ['query', 'trace', 'blast-radius']) assert.ok(mode(name).includes(absent), `mode-${name}.md reports a missing graph plainly`);
            for (const name of MODES) assert.doesNotMatch(mode(name), /HARD-GATE|BLOCKED until|before concluding|MUST run at least one graph/i, `mode-${name}.md imposes no graph gate on other work`);
        }
    },
    {
        name: 'TC-GCM-008 the old skill folders stay deleted, graph-export stays, no workflow step names a removed skill and the called-skill profile lists graph-code',
        skip: SKIP,
        fn: () => {
            for (const name of REMOVED) assert.ok(!fs.existsSync(path.join(SKILLS, name)), `${name} must not exist as a skill folder`);
            assert.ok(fs.existsSync(path.join(SKILLS, 'graph-export', 'SKILL.md')), 'graph-export remains a separate skill');
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            const document = JSON.parse(raw);
            for (const name of REMOVED) assert.ok(!raw.includes(name), `workflows.json must not mention ${name}`);
            const steps = new Set();
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const { skill: step } of manifest.occurrences) steps.add(step);
                }
            }
            for (const name of REMOVED) assert.ok(!steps.has(name), `no resolved workflow step runs ${name}`);
            const profile = JSON.parse(read(REPO_ROOT, '.claude', 'config', 'skill-profiles.json'));
            assert.ok(profile.calledByOthers.skills.includes('graph-code'), 'calledByOthers lists graph-code');
            for (const name of REMOVED) assert.ok(!profile.calledByOthers.skills.includes(name), `calledByOthers must not list ${name}`);
        }
    },
    {
        name: 'TC-GCM-009 the debugger-trace protocol is a guide plus reminder in SKILL.md and is never carried by a mode reference',
        skip: SKIP,
        fn: () => {
            const text = skill();
            const guides = [...text.matchAll(/<!-- PROTOCOL-GUIDES:START -->([\s\S]*?)<!-- PROTOCOL-GUIDES:END -->/g)].map(match => match[1]).join('\n');
            assert.match(guides, /^- `end-to-start-debugger-trace` — /m, 'SKILL.md carries the guide line');
            assert.ok(text.includes('<!-- SYNC:end-to-start-debugger-trace:reminder -->'), 'SKILL.md carries the reminder');
            assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', 'end-to-start-debugger-trace.md')), 'the guide points at a published protocol file');
            for (const name of MODES) {
                assert.doesNotMatch(mode(name), /PROTOCOL-GUIDES|<!-- SYNC:/, `mode-${name}.md carries no protocol guide or SYNC fence`);
            }
        }
    },
    {
        name: 'TC-GCM-010 graph-code description keeps the [Code Intelligence] tag, the 250-character limit and names every mode',
        skip: SKIP,
        fn: () => {
            const match = /^description: '(.*)'$/m.exec(skill());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1];
            assert.match(description, /^\[Code Intelligence\] Use when /);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            assert.match(description, /--mode=\{build\|query\|trace\|blast-radius\|connect-api\}/);
            for (const keyword of [/build/i, /callers/i, /trac/i, /blast radius/i, /API/]) assert.match(description, keyword, `description routes ${keyword}`);
        }
    },
    {
        name: 'TC-GCM-011 the prompt-gate hook routes the graph build to /graph-code --mode=build',
        skip: SKIP,
        fn: () => {
            const hook = read(REPO_ROOT, '.claude', 'hooks', 'init-prompt-gate.cjs');
            assert.match(hook, /\/\\\/graph-code\/i/, 'the allow-list admits the graph-code slash command');
            assert.ok(hook.includes('`/graph-code --mode=build` installs the rest'), 'the no-toolchain note names the build mode');
            for (const name of REMOVED) assert.ok(!hook.includes(name), `the hook must not mention ${name}`);
        }
    },
    {
        name: 'TC-GCM-012 no live source names a removed graph skill (the "former" lines of SKILL.md are the only allowed mention)',
        skip: SKIP,
        fn: () => {
            const offenders = [];
            for (const root of LIVE_SOURCE_ROOTS) {
                for (const rel of walk(root)) {
                    if (SCAN_EXCLUDED.has(rel)) continue;
                    const lines = read(REPO_ROOT, ...rel.split('/')).split('\n');
                    lines.forEach((line, index) => {
                        if (!SKILL_NAME_PATTERNS.some(pattern => pattern.test(line))) return;
                        if (allowedMention(rel, line)) return;
                        offenders.push(`${rel}:${index + 1}`);
                    });
                }
            }
            assert.deepEqual(offenders, [], `live sources still name a removed graph skill:\n${offenders.join('\n')}`);
        }
    }
];

module.exports = { name: 'graph-code-modes-merge', tests };
