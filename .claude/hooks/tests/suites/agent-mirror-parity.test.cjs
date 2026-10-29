'use strict';

/**
 * Agent/skill mirror parity — the same quality protocol, on every host.
 *
 * WHY THIS EXISTS: a sub-agent answers from its own prompt, not from the orchestrator's context.
 * When `.claude/agents/<name>.md` gains a protocol but the Codex or OpenCode mirror is not
 * regenerated, the same role reviews to a different standard per host — silently, because every
 * existing gate reads the Claude source. The same failure applies to a skill mirror.
 *
 * INVARIANTS (universal over every carrier, not a sampled subset):
 *   TC-AMP-001  the agent set is identical in `.claude/agents`, `.codex/agents` and `.opencode/agent`
 *   TC-AMP-002  every agent carries the SAME `SYNC:<tag>` / `:reminder` set and bodies on all three
 *               hosts — OpenCode verbatim after whitespace normalization, Codex under the DOCUMENTED
 *               transformation (`compat-rewrite.mjs`: `/skill` -> `$skill`, tool names -> host-neutral)
 *   TC-AMP-003  every skill mirror `.agents/skills/<name>/SKILL.md` carries the same blocks, under the
 *               same documented transformation
 *   TC-AMP-004  every code-touching sub-agent carries the core engineering gate on every host
 *   TC-AMP-005  mutation probe — a corrupted mirror body or a removed tag is REPORTED (non-vacuous)
 *   TC-AMP-006  fail-closed — a file with no parseable fence is an explicit error, never a silent pass
 *   TC-AMP-007  the agent/skill matrix validates clean, so a same-role parity gap fails the build
 *
 * The comparison normalizes only line endings and trailing whitespace; every substantive difference
 * is a failure. A host-dialect change must be added to `compat-rewrite.mjs`, which this suite treats
 * as the single owner of that transformation.
 */

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');
const { resolvePythonCommand: findPythonCommand } = require('../lib/python-command.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CLAUDE_AGENTS = path.join(ROOT, '.claude', 'agents');
const CODEX_AGENTS = path.join(ROOT, '.codex', 'agents');
const OPENCODE_AGENTS = path.join(ROOT, '.opencode', 'agent');
const CLAUDE_SKILLS = path.join(ROOT, '.claude', 'skills');
const CODEX_SKILLS = path.join(ROOT, '.agents', 'skills');

/** Mirrors exist only in the framework repo; elsewhere the suite is explicitly skipped. */
const HAS_MIRRORS = fs.existsSync(CODEX_AGENTS) && fs.existsSync(OPENCODE_AGENTS);
const SKIP = HAS_MIRRORS ? false : 'framework repo only: no .codex/.opencode mirror tree';

/** Line endings and trailing whitespace are checkout noise; every other difference is drift. */
function normalize(text) {
    return String(text)
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map(line => line.replace(/[ \t]+$/, ''))
        .join('\n')
        .trim();
}

const BLOCK_RE = /<!-- SYNC:([a-z0-9:-]+) -->\n([\s\S]*?)\n<!-- \/SYNC:\1 -->/g;

/** Every SYNC body and reminder in a file, keyed by its exact tag (base or `:reminder`). */
function blocksOf(text) {
    const out = new Map();
    BLOCK_RE.lastIndex = 0;
    let match;
    while ((match = BLOCK_RE.exec(normalize(text)))) out.set(match[1], match[2]);
    return out;
}

function namesIn(dir, extension) {
    return fs.readdirSync(dir)
        .filter(file => file.endsWith(extension))
        .map(file => file.slice(0, -extension.length))
        .sort();
}

let compatModule = null;
async function compat() {
    if (!compatModule) {
        compatModule = await import(pathToFileURL(path.join(ROOT, '.claude/scripts/codex/compat-rewrite.mjs')).href);
    }
    return compatModule;
}

async function expectedCodexBody(claudeBody) {
    const rewrite = await compat();
    const skills = fs.readdirSync(CLAUDE_SKILLS).filter(name => fs.existsSync(path.join(CLAUDE_SKILLS, name, 'SKILL.md')));
    const map = rewrite.buildSkillReferenceMap(skills);
    return normalize(rewrite.rewriteClaudeToolTermsForCodex(rewrite.rewriteSkillMentionsForCodex(claudeBody, map)));
}

/** Compare one carrier pair; returns a list of human-readable problems. */
function compareBlocks(problems, label, claudeBlocks, hostBlocks, expected) {
    const expectedTags = [...claudeBlocks.keys()].sort();
    const actualTags = [...hostBlocks.keys()].sort();
    assertEqual(
        JSON.stringify(actualTags),
        JSON.stringify(expectedTags),
        `${label}: SYNC tag set drifted\n  expected ${expectedTags.length}: ${expectedTags.join(', ')}\n  actual   ${actualTags.length}: ${actualTags.join(', ')}`,
    );
    for (const [tag, body] of claudeBlocks) {
        const want = normalize(body);
        const got = normalize(hostBlocks.get(tag));
        const target = typeof expected === 'function' ? expected(want) : want;
        if (got !== normalize(target)) problems.push(`${label}: '${tag}' body drifted from canonical`);
    }
}

module.exports = {
    name: 'Agent and skill mirror parity',
    tests: [
        {
            name: '[agent-mirror] TC-AMP-001 every Claude agent has a Codex and an OpenCode mirror, with no extras',
            skip: SKIP,
            fn: () => {
                const claude = namesIn(CLAUDE_AGENTS, '.md');
                assertEqual(JSON.stringify(namesIn(CODEX_AGENTS, '.toml')), JSON.stringify(claude), 'Codex agent set');
                assertEqual(JSON.stringify(namesIn(OPENCODE_AGENTS, '.md')), JSON.stringify(claude), 'OpenCode agent set');
            },
        },
        {
            name: '[agent-mirror] TC-AMP-002 every agent carries the same SYNC tag set and bodies on all three hosts',
            skip: SKIP,
            fn: async () => {
                const problems = [];
                for (const name of namesIn(CLAUDE_AGENTS, '.md')) {
                    const claude = blocksOf(fs.readFileSync(path.join(CLAUDE_AGENTS, `${name}.md`), 'utf8'));
                    assertTrue(claude.size > 0, `${name}: the Claude agent carries no SYNC block`);
                    const codex = blocksOf(fs.readFileSync(path.join(CODEX_AGENTS, `${name}.toml`), 'utf8'));
                    const opencode = blocksOf(fs.readFileSync(path.join(OPENCODE_AGENTS, `${name}.md`), 'utf8'));
                    compareBlocks(problems, `${name} (opencode)`, claude, opencode);
                    for (const [tag, body] of claude) {
                        const want = await expectedCodexBody(body);
                        if (normalize(codex.get(tag)) !== want) problems.push(`${name} (codex): '${tag}' is not the documented rewrite`);
                    }
                    assertEqual(JSON.stringify([...codex.keys()].sort()), JSON.stringify([...claude.keys()].sort()), `${name}: Codex SYNC tag set drifted`);
                }
                assertEqual(problems.length, 0, `agent protocol drift:\n  ${problems.join('\n  ')}`);
            },
        },
        {
            name: '[agent-mirror] TC-AMP-003 every skill mirror carries the same SYNC blocks as its Claude source',
            skip: SKIP,
            fn: async () => {
                const problems = [];
                let compared = 0;
                for (const name of fs.readdirSync(CLAUDE_SKILLS)) {
                    const source = path.join(CLAUDE_SKILLS, name, 'SKILL.md');
                    if (!fs.existsSync(source)) continue;
                    const mirror = path.join(CODEX_SKILLS, name, 'SKILL.md');
                    assertTrue(fs.existsSync(mirror), `${name}: missing .agents/skills mirror`);
                    const claude = blocksOf(fs.readFileSync(source, 'utf8'));
                    const codex = blocksOf(fs.readFileSync(mirror, 'utf8'));
                    assertEqual(
                        JSON.stringify([...codex.keys()].sort()),
                        JSON.stringify([...claude.keys()].sort()),
                        `${name}: the .agents mirror SYNC tag set drifted`,
                    );
                    for (const [tag, body] of claude) {
                        if (normalize(codex.get(tag)) !== await expectedCodexBody(body)) {
                            problems.push(`${name}: '${tag}' is not the documented rewrite of its Claude source`);
                        }
                        compared++;
                    }
                }
                assertTrue(compared > 300, `expected the whole skill corpus, compared ${compared} blocks`);
                assertEqual(problems.length, 0, `skill protocol drift:\n  ${problems.join('\n  ')}`);
            },
        },
        {
            name: '[agent-mirror] TC-AMP-004 every code-touching sub-agent carries the core quality gate on every host',
            skip: SKIP,
            fn: () => {
                // Explicit, fail-loud allowlist: a NEW agent is not exempt by default. A role that
                // reviews or changes code must carry the gate on all three hosts; a non-code role is
                // waived here, never silently.
                const NON_CODE_AGENTS = new Set(['docs-manager', 'git-manager', 'journal-writer', 'knowledge-worker', 'researcher']);
                const problems = [];
                for (const name of namesIn(CLAUDE_AGENTS, '.md')) {
                    if (NON_CODE_AGENTS.has(name)) continue;
                    const claude = blocksOf(fs.readFileSync(path.join(CLAUDE_AGENTS, `${name}.md`), 'utf8'));
                    const codex = blocksOf(fs.readFileSync(path.join(CODEX_AGENTS, `${name}.toml`), 'utf8'));
                    const opencode = blocksOf(fs.readFileSync(path.join(OPENCODE_AGENTS, `${name}.md`), 'utf8'));
                    for (const tag of ['core-engineering-principles', 'core-engineering-principles:reminder']) {
                        if (!claude.has(tag)) problems.push(`${name}: Claude agent lost '${tag}'`);
                        if (!codex.has(tag)) problems.push(`${name}: Codex agent lost '${tag}'`);
                        if (!opencode.has(tag)) problems.push(`${name}: OpenCode agent lost '${tag}'`);
                    }
                }
                assertEqual(problems.length, 0, `core gate missing from a mirrored role:\n  ${problems.join('\n  ')}`);
            },
        },
        {
            name: '[agent-mirror] TC-AMP-005 mutation probe: a corrupted mirror body and a removed tag are both reported',
            skip: SKIP,
            fn: () => {
                const sample = blocksOf(fs.readFileSync(path.join(CLAUDE_AGENTS, 'code-reviewer.md'), 'utf8'));
                const tag = 'core-engineering-principles';
                const original = sample.get(tag);
                assertTrue(typeof original === 'string' && original.length > 100, 'probe needs a real body');
                const corrupted = new Map(sample);
                corrupted.set(tag, `${original}\nsilent drift`);
                const problems = [];
                compareBlocks(problems, 'probe', sample, corrupted);
                assertEqual(problems.length, 1, 'a corrupted body must be reported');

                const removed = new Map(sample);
                removed.delete(tag);
                let threw = false;
                try {
                    compareBlocks([], 'probe', sample, removed);
                } catch (error) {
                    threw = /SYNC tag set drifted/.test(error.message);
                }
                assertTrue(threw, 'a removed tag must fail the tag-set comparison');
            },
        },
        {
            name: '[agent-mirror] TC-AMP-006 fail-closed: a mirror without a parseable fence is never a silent pass',
            skip: SKIP,
            fn: () => {
                const empty = blocksOf('no fences here');
                assertEqual(empty.size, 0, 'a fence-less file parses to zero blocks');
                let threw = false;
                try {
                    compareBlocks([], 'probe', blocksOf('<!-- SYNC:x -->\nbody\n<!-- /SYNC:x -->'), empty);
                } catch (error) {
                    threw = /SYNC tag set drifted/.test(error.message);
                }
                assertTrue(threw, 'zero parsed blocks against a non-empty source must fail');
            },
        },
        {
            name: '[agent-mirror] TC-AMP-007 the agent/skill matrix validates clean, so a same-role gap fails the build',
            skip: SKIP,
            fn: () => {
                const python = findPythonCommand({ cwd: ROOT });
                const run = spawnSync(
                    python.command,
                    [...python.baseArgs, path.join(ROOT, '.claude/scripts/agent_protocol_matrix.py'), '--validate'],
                    { cwd: ROOT, encoding: 'utf8', timeout: 120000, windowsHide: true },
                );
                assertEqual(
                    run.status,
                    0,
                    `agent_protocol_matrix --validate failed (it enforces same-role parity):\n${(run.stdout || '') + (run.stderr || '')}`,
                );
            },
        },
    ],
};
