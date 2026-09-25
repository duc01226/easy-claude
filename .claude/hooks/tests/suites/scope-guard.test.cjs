'use strict';

/**
 * Scope guard — a plan that implements a supplied spec stays anchored to that spec AS SUPPLIED.
 *
 * Business intent: scope cannot grow silently when the spec is edited during the same run. `plan`
 * records `spec_baseline: [{path, blob}]` with `git hash-object -w -- <path>`; `plan-review` traces
 * every phase task to the baseline blob, and anything else becomes a proposed addition that needs
 * approval. Invariants guarded:
 *   - the plan text records the baseline with `-w` (restorable even for an uncommitted spec) and `--`
 *     (a path cannot become an option), and routes new requirements to "Proposed additions";
 *   - the plan-review text traces to the baseline blob, validates the blob id against a full-object-id
 *     regex before any git call, runs git as an argv vector, and names "baseline unrecoverable" with no
 *     fallback to the current spec;
 *   - no supplied spec means no baseline and unchanged behavior;
 *   - the git commands the text prescribes really restore the original content (temp-repo fixtures).
 *
 * PORTABILITY: the skill files read here ship inside `.claude/`, so the content checks hold in any
 * adopting project. Every git fixture is a fresh temp repository driven through argv arrays, with
 * HOME/USERPROFILE/TMPDIR/TEMP/TMP pointed at the temp dir, system config disabled, and inherited
 * GIT_* repository/config switches removed — so a developer's global git config or a surrounding
 * git hook environment cannot change the result. Behavior is identical on Windows, macOS and Linux:
 * `git hash-object` and `git cat-file` take the same argv on every OS, and fixture text is LF-only.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { childEnv } = require('../lib/hook-runner.cjs');

const SKILLS_DIR = path.resolve(__dirname, '..', '..', '..', 'skills');
const PLAN_SKILL = path.join(SKILLS_DIR, 'plan', 'SKILL.md');
const REVIEW_SKILL = path.join(SKILLS_DIR, 'plan-review', 'SKILL.md');

const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

/** Text between `start` and the first `end` match after it; fails loudly when the anchor is gone. */
function section(text, start, end) {
    const from = text.indexOf(start);
    assert.ok(from >= 0, `anchor missing: ${start}`);
    const rest = text.slice(from + start.length);
    const stop = rest.search(end);
    return start + (stop >= 0 ? rest.slice(0, stop) : rest);
}

const planBaselineSection = () => section(read(PLAN_SKILL), '## Supplied-Spec Scope Baseline', /\n## /);
const reviewBaselineItem = () => section(read(REVIEW_SKILL), '**Spec baseline trace (scope guard)**', /\n- \[ \] \*\*/);

/** The baseline command exactly as the plan skill prescribes it, as an argv vector for `path`. */
function hashObjectArgv(relPath) {
    const match = read(PLAN_SKILL).match(/`git (hash-object[^`]*<path>)`/);
    assert.ok(match, 'plan SKILL.md must prescribe a `git hash-object ... <path>` command');
    return match[1].split(/\s+/).map(token => (token === '<path>' ? relPath : token));
}

/** The object-id regex exactly as the plan-review skill states it. */
function blobIdRegex() {
    const match = read(REVIEW_SKILL).match(/`(\^\[0-9a-f\]\{40\}[^`]*\$)`/);
    assert.ok(match, 'plan-review SKILL.md must state the blob-id regex');
    return new RegExp(match[1]);
}

const GIT_SKIP = (() => {
    const probe = spawnSync('git', ['--version'], { encoding: 'utf8' });
    return probe.status === 0 ? false : 'git is not available on this host';
})();

// Inherited switches that would redirect git away from the fixture repo or inject config.
const SCRUBBED_GIT_KEYS = [
    'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_COMMON_DIR', 'GIT_NAMESPACE', 'GIT_CEILING_DIRECTORIES', 'GIT_CONFIG', 'GIT_CONFIG_GLOBAL',
    'GIT_CONFIG_SYSTEM', 'GIT_CONFIG_PARAMETERS', 'GIT_CONFIG_COUNT', 'XDG_CONFIG_HOME'
];

/** A fresh temp git repo plus an argv-only git runner; the caller removes it with `fx.cleanup()`. */
function makeRepo() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-guard-'));
    const overrides = { HOME: dir, USERPROFILE: dir, TMPDIR: dir, TEMP: dir, TMP: dir, GIT_CONFIG_NOSYSTEM: '1' };
    for (const key of SCRUBBED_GIT_KEYS) overrides[key] = undefined;
    const env = childEnv(overrides);
    const run = args => spawnSync('git', args, { cwd: dir, env, encoding: 'utf8' });
    const git = args => {
        const r = run(args);
        assert.equal(r.status, 0, `git ${args.join(' ')} failed: ${r.stderr}`);
        return r.stdout.trim();
    };
    git(['init', '-q']);
    git(['config', 'user.email', 'scope-guard@test.local']);
    git(['config', 'user.name', 'scope-guard-test']);
    git(['config', 'commit.gpgsign', 'false']);
    git(['config', 'core.autocrlf', 'false']);
    const write = (rel, text) => fs.writeFileSync(path.join(dir, rel), text);
    const cleanup = () => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    return { dir, run, git, write, cleanup };
}

const ORIGINAL = '# Spec\n\n- BR-1: export the report as CSV.\n';
const EDITED = ORIGINAL + '- BR-2: also lock the bill after export.\n';

const tests = [
    {
        name: '[scope-guard] TC-GWF-023 plan records spec_baseline path + blob via git hash-object -w -- <path>',
        fn: () => {
            // Given the plan skill text
            const baseline = planBaselineSection();
            const planText = read(PLAN_SKILL);
            // When a spec is supplied (the baseline section governs that case)
            // Then it records spec_baseline in plan.md frontmatter with the restorable, option-safe command
            assert.match(baseline, /`git hash-object -w -- <path>`/);
            assert.match(baseline, /`spec_baseline: \[\{path, blob\}\]`/);
            assert.match(baseline, /frontmatter/);
            assert.match(baseline, /never rewrite it/, 'the baseline must not follow later spec edits');
            assert.deepEqual(hashObjectArgv('spec.md'), ['hash-object', '-w', '--', 'spec.md']);
            const template = section(planText, '**Plan File Specification**', /\n- Save overview/);
            assert.match(template, /\n\s+spec_baseline: /, 'the plan.md frontmatter template carries spec_baseline');
        }
    },
    {
        name: '[scope-guard] TC-GWF-024 plan-review traces to the baseline blob, not the current spec',
        fn: () => {
            // Given the plan-review skill text
            const review = read(REVIEW_SKILL);
            const item = reviewBaselineItem();
            // When a spec_baseline exists
            // Then tracing reads the baseline blob through an argv git call and never the current spec file
            assert.match(item, /When `plan\.md` frontmatter carries `spec_baseline/);
            assert.match(item, /trace requirements to the BASELINE content, never to the current spec file/);
            assert.match(item, /`git cat-file -p <blob>`, run as an argv vector/);
            assert.match(item, /never a shell string/);
            assert.match(section(review, '### Step 1: Read Plan Files', /\n### /), /`spec_baseline`/);
            assert.match(review, /\*\*YAGNI\*\*[^\n]*traceable to a stated requirement \(the `spec_baseline` content when present\)/);
        }
    },
    {
        name: '[scope-guard] TC-GWF-025 a requirement outside the baseline becomes a proposed addition, not a phase',
        fn: () => {
            // Given the plan and plan-review skill texts
            const baseline = planBaselineSection();
            const item = reviewBaselineItem();
            // When a requirement is new (not in the baseline)
            // Then plan routes it to "Proposed additions (need approval)" and asks, and review flags untraced tasks
            assert.match(baseline, /`## Proposed additions \(need approval\)` section in `plan\.md`, NOT into a phase/);
            assert.match(baseline, /`AskUserQuestion`/);
            assert.match(baseline, /Only an `APPROVED` entry may enter a phase/);
            assert.match(baseline, /never drop a gap finding silently/);
            assert.match(item, /`APPROVED` entry under `## Proposed additions \(need approval\)`\. A phase task with no such trace is a finding/);
        }
    },
    {
        name: '[scope-guard] TC-GWF-026 a committed spec edited after the baseline restores its original content',
        skip: GIT_SKIP,
        fn: () => {
            const fx = makeRepo();
            try {
                // Given a committed spec and a baseline recorded with the plan skill's own command
                fx.write('spec.md', ORIGINAL);
                fx.git(['add', '--', 'spec.md']);
                fx.git(['commit', '-q', '-m', 'spec']);
                const blob = fx.git(hashObjectArgv('spec.md'));
                assert.match(blob, blobIdRegex(), 'a real baseline blob id passes the review regex');
                // When the spec is edited and committed later in the same run
                fx.write('spec.md', EDITED);
                fx.git(['commit', '-q', '-am', 'grow spec']);
                assert.equal(fx.git(['show', 'HEAD:spec.md']) + '\n', EDITED, 'the current spec really changed');
                // Then git cat-file -p <blob> (argv) returns the original content
                assert.equal(fx.git(['cat-file', '-p', blob]) + '\n', ORIGINAL);
            } finally {
                fx.cleanup();
            }
        }
    },
    {
        name: '[scope-guard] TC-GWF-027 no supplied spec means no baseline and unchanged behavior',
        fn: () => {
            // Given the plan and plan-review skill texts
            const baseline = planBaselineSection();
            const item = reviewBaselineItem();
            const planText = read(PLAN_SKILL);
            // When no spec is supplied
            // Then plan omits the baseline and proposals section, and review applies its other checks unchanged
            assert.match(baseline, /\*\*No spec supplied → no baseline\.\*\* Omit `spec_baseline` and the proposals section; planning behaves exactly as without this section\./);
            assert.match(planText, /spec_baseline: [^\n]*# only when the input names a spec; omit otherwise/);
            assert.match(item, /No `spec_baseline` \(no spec supplied\) → record `No spec baseline` and apply the other checks unchanged\./);
        }
    },
    {
        name: '[scope-guard] TC-GWF-045 an uncommitted spec stays restorable after edits because the baseline uses -w',
        skip: GIT_SKIP,
        fn: () => {
            const fx = makeRepo();
            try {
                // Given a spec that was never committed, and a spec whose name starts with "-"
                fx.write('spec.md', ORIGINAL);
                fx.write('-dash-spec.md', ORIGINAL);
                // When the plan skill's command records the blobs and the specs are edited
                const blob = fx.git(hashObjectArgv('spec.md'));
                const dashBlob = fx.git(hashObjectArgv('-dash-spec.md'));
                fx.write('spec.md', EDITED);
                fx.write('-dash-spec.md', EDITED);
                // Then git cat-file -p <blob> returns the original content for both
                assert.equal(fx.git(['cat-file', '-p', blob]) + '\n', ORIGINAL);
                assert.equal(fx.git(['cat-file', '-p', dashBlob]) + '\n', ORIGINAL, '`--` keeps a dash path a path');
                // And the contrast: without -w the object is never stored, so the content is lost after an edit
                const unstored = fx.git(['hash-object', '--', 'spec.md']);
                fx.write('spec.md', ORIGINAL);
                assert.notEqual(fx.run(['cat-file', '-p', unstored]).status, 0, 'a blob hashed without -w is unrecoverable');
            } finally {
                fx.cleanup();
            }
        }
    },
    {
        name: '[scope-guard] TC-GWF-046 the review blob-id regex rejects hostile values and an unrecoverable baseline is a named finding',
        skip: GIT_SKIP,
        fn: () => {
            const fx = makeRepo();
            try {
                // Given the blob-id regex read from the plan-review text and a real fixture blob id
                const idRegex = blobIdRegex();
                fx.write('spec.md', ORIGINAL);
                const realBlob = fx.git(hashObjectArgv('spec.md'));
                // When checked against hostile and real values
                // Then the three hostile values are rejected and the real ids pass
                for (const hostile of ['HEAD:spec.md', '--batch', 'abc123']) {
                    assert.equal(idRegex.test(hostile), false, `hostile blob value must be rejected: ${hostile}`);
                }
                assert.equal(idRegex.test(realBlob), true, 'the real fixture blob id passes');
                assert.equal(idRegex.test('a'.repeat(64)), true, 'a SHA-256 object id passes');
                // And a well-formed id that is absent from the store fails the argv read (the unrecoverable path)
                assert.notEqual(fx.run(['cat-file', '-p', '0'.repeat(40)]).status, 0);
                // And the review text names the finding with no fallback to the current spec
                const item = reviewBaselineItem();
                assert.match(item, /BEFORE any git call/);
                assert.match(item, /is the finding `baseline unrecoverable: <path>`\. There is NO fallback to the current spec/);
            } finally {
                fx.cleanup();
            }
        }
    }
];

module.exports = { name: 'scope-guard', tests };
