import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isFrameworkRepo } from './framework-repo.helper.mjs';

const execFileAsync = promisify(execFile);

// Importing the gate transitively imports migrate-claude-to-codex.mjs + sync-context-workflows.mjs.
// All three guard their main()/script-entry behind an invoked-as-script check, so this import must
// NOT trigger a real (destructive) sync. If that guard regresses, these tests would wipe
// .agents/skills — the assertions below stay purely on diffTrees/readTreeFiles over tmp dirs (the
// one live end-to-end case spawns the gate as a SUBPROCESS, which only writes to a tmp dir).
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const gatePath = path.resolve(thisDir, '..', 'verify-sync-divergence.mjs');
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const { diffTrees, readTreeFiles } = await import(pathToFileURL(gatePath).href);

// TC-SKILLFIX-020 — identical trees → no divergence (the in-sync PASS case).
test('TC-SKILLFIX-020: identical maps produce no diffs', () => {
    const a = new Map([['skill/SKILL.md', 'x\n'], ['skill/extra.md', 'y\n']]);
    const b = new Map([['skill/SKILL.md', 'x\n'], ['skill/extra.md', 'y\n']]);
    assert.deepEqual(diffTrees(a, b), []);
});

// TC-SKILLFIX-021 — content drift (stale mirror body) is flagged as 'content'.
test('TC-SKILLFIX-021: differing content is flagged', () => {
    const expected = new Map([['a/SKILL.md', 'fresh\n']]);
    const actual = new Map([['a/SKILL.md', 'stale\n']]);
    assert.deepEqual(diffTrees(expected, actual), [{ relPath: 'a/SKILL.md', kind: 'content' }]);
});

// TC-SKILLFIX-022 — source produced a file the mirror lacks (new skill, forgot to sync).
test('TC-SKILLFIX-022: file missing from mirror is flagged', () => {
    const expected = new Map([['a/SKILL.md', 'x\n'], ['b/SKILL.md', 'y\n']]);
    const actual = new Map([['a/SKILL.md', 'x\n']]);
    assert.deepEqual(diffTrees(expected, actual), [{ relPath: 'b/SKILL.md', kind: 'missing-in-mirror' }]);
});

// TC-SKILLFIX-023 — mirror has an orphan/hand-added file with no source counterpart.
test('TC-SKILLFIX-023: extra mirror file is flagged', () => {
    const expected = new Map([['a/SKILL.md', 'x\n']]);
    const actual = new Map([['a/SKILL.md', 'x\n'], ['a/hand-edit.md', 'z\n']]);
    assert.deepEqual(diffTrees(expected, actual), [{ relPath: 'a/hand-edit.md', kind: 'extra-in-mirror' }]);
});

// TC-SKILLFIX-024 — readTreeFiles excludes the sentinel and CRLF-normalizes, so a
// line-ending-only or sentinel-only difference does NOT register as divergence.
test('TC-SKILLFIX-024: readTreeFiles excludes sentinel and normalizes CRLF', async () => {
    const expectedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-div-exp-'));
    const actualDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-div-act-'));
    try {
        await fs.mkdir(path.join(expectedDir, 'a'), { recursive: true });
        await fs.mkdir(path.join(actualDir, 'a'), { recursive: true });
        await fs.writeFile(path.join(expectedDir, 'a', 'SKILL.md'), 'line1\nline2\n');
        await fs.writeFile(path.join(actualDir, 'a', 'SKILL.md'), 'line1\r\nline2\r\n');
        // Sentinel exists only in the committed mirror; it must be excluded from comparison.
        await fs.writeFile(path.join(actualDir, '.codex-mirror.json'), '{"managedBy":"codex-sync"}\n');

        const expected = await readTreeFiles(expectedDir);
        const actual = await readTreeFiles(actualDir);

        assert.ok(!actual.has('.codex-mirror.json'), 'sentinel must be excluded from the tree map');
        assert.deepEqual(diffTrees(expected, actual), [], 'CRLF-only difference must not be divergence');
    } finally {
        await fs.rm(expectedDir, { recursive: true, force: true });
        await fs.rm(actualDir, { recursive: true, force: true });
    }
});

// Determinism guard: diffTrees output ordering is stable (sorted by relPath then kind),
// so CI failure lists don't churn between runs.
test('TC-SKILLFIX-024b: diff ordering is stable and sorted', () => {
    const expected = new Map([['z/SKILL.md', '1\n'], ['a/SKILL.md', '1\n'], ['m/SKILL.md', 'fresh\n']]);
    const actual = new Map([['m/SKILL.md', 'stale\n'], ['a/SKILL.md', '1\n']]);
    const diffs = diffTrees(expected, actual);
    assert.deepEqual(diffs.map(d => d.relPath), ['m/SKILL.md', 'z/SKILL.md']);
    assert.deepEqual(diffs.map(d => d.kind), ['content', 'missing-in-mirror']);
});

// ── CONTEXT-mirror idempotency (folded into this gate) ─────────────────────────────────────────────
// checkContextMirror() compares a fresh render of AGENTS.md + .codex/CODEX_CONTEXT.md (keyed by
// repo-relative path) against the committed copies using the SAME diffTrees. These cases lock the
// two-file context surface; the diffTrees verdicts themselves are already covered above.

// TC-CTXMIRROR-001 — an in-sync context mirror (both files identical) yields no divergence.
test('TC-CTXMIRROR-001: identical context maps (AGENTS.md + CODEX_CONTEXT.md) → no diffs', () => {
    const fresh = new Map([['AGENTS.md', 'a\n'], ['.codex/CODEX_CONTEXT.md', 'c\n']]);
    const committed = new Map([['AGENTS.md', 'a\n'], ['.codex/CODEX_CONTEXT.md', 'c\n']]);
    assert.deepEqual(diffTrees(fresh, committed), []);
});

// TC-CTXMIRROR-002 — a stale committed AGENTS.md (the Finding-1 failure mode) is flagged 'content'.
test('TC-CTXMIRROR-002: a stale committed AGENTS.md is flagged as content drift', () => {
    const fresh = new Map([['AGENTS.md', 'fresh\n'], ['.codex/CODEX_CONTEXT.md', 'c\n']]);
    const committed = new Map([['AGENTS.md', 'stale\n'], ['.codex/CODEX_CONTEXT.md', 'c\n']]);
    assert.deepEqual(diffTrees(fresh, committed), [{ relPath: 'AGENTS.md', kind: 'content' }]);
});

// TC-CTXMIRROR-003 — committed == fresh, live against this repo. Spawns the gate as a SUBPROCESS
// (non-destructive: renders into a tmp dir) and asserts BOTH surfaces are in sync. This is the
// idempotency assertion — if a context generator's text was edited without a full re-sync, the
// committed AGENTS.md / CODEX_CONTEXT.md would diverge from a fresh render and this fails.
test('TC-CTXMIRROR-003: gate passes against the committed repo (skills + context both in sync)', async () => {
    const { stdout } = await execFileAsync(process.execPath, [gatePath], { cwd: repoRoot });
    assert.match(stdout, /skills: PASS/, 'committed .agents/skills mirror must equal a fresh render');
    assert.match(stdout, /context: PASS/, 'committed AGENTS.md + CODEX_CONTEXT.md must equal a fresh render');
});

// --- TC-HOOKMIRROR-001..003 — the FOURTH guarded surface: .codex/hooks.json ---
//
// This mirror decides which hooks a Codex session RUNS, so a stale copy silently
// downgrades the safety gates instead of merely serving stale guidance. The oracle
// must call the REAL writer (materializeHookMirror), never a second derivation.

const syncHooksPath = path.resolve(thisDir, '..', 'sync-hooks.mjs');
const { materializeHookMirror, claudeSettingsPath } = await import(pathToFileURL(syncHooksPath).href);
const { unexpectedHookSkips } = await import(pathToFileURL(gatePath).href);

// The three mutation scripts the gate imports for its oracles. Each one writes the
// real mirrors when run as a script, so each must stay inert on import.
const SYNC_MODULES = ['sync-hooks.mjs', 'sync-context-workflows.mjs', 'migrate-claude-to-codex.mjs'];

// TC-HOOKMIRROR-001 — importing a sync module must NOT write the real mirrors.
// Without the invoked-as-script guard, merely importing one for the oracle would
// regenerate the committed mirrors as a side effect of *checking* them.
//
// The oracle has to run in a SUBPROCESS. This file already imported all three
// modules at load time (:20, :120), so any import-time write happened before a
// stat taken here could observe it — an in-process before/after comparison is
// taken after the event it claims to detect, and passes whether or not the guard
// exists. The child below performs the import for the first time in its own
// process, so the window is genuinely open across the measurement.
//
// Two oracles, because either alone is blind: content catches a regenerating
// write (the mirrors need only be momentarily stale for the bytes to differ) and
// mtime catches a rewrite that happens to reproduce identical bytes.
test('TC-HOOKMIRROR-001: importing a sync module in a fresh process does not write the committed mirrors', async () => {
    const MIRRORS = [
        path.join(repoRoot, '.codex', 'hooks.json'),
        path.join(repoRoot, '.codex', 'CODEX_CONTEXT.md'),
        path.join(repoRoot, 'AGENTS.md'),
        path.join(repoRoot, '.agents', 'skills', 'why-review', 'SKILL.md')
    ];

    const snapshot = async () => {
        const state = new Map();
        for (const file of MIRRORS) {
            const [body, stat] = await Promise.all([fs.readFile(file), fs.stat(file)]);
            state.set(file, { hash: createHash('sha256').update(body).digest('hex'), mtimeMs: stat.mtimeMs });
        }
        return state;
    };

    const probeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hookmirror-import-'));
    const probe = path.join(probeDir, 'import-only.mjs');
    const importLines = SYNC_MODULES
        .map(name => `await import(${JSON.stringify(pathToFileURL(path.resolve(thisDir, '..', name)).href)});`)
        .join('\n');
    await fs.writeFile(probe, `${importLines}\n`);

    try {
        const before = await snapshot();
        // cwd is the repo root on purpose: a regressed guard would resolve the real
        // project from here, which is exactly the destructive case under test.
        await execFileAsync(process.execPath, [probe], { cwd: repoRoot });
        const after = await snapshot();

        for (const file of MIRRORS) {
            const rel = path.relative(repoRoot, file);
            assert.equal(after.get(file).hash, before.get(file).hash, `importing a sync module rewrote ${rel}`);
            assert.equal(after.get(file).mtimeMs, before.get(file).mtimeMs, `importing a sync module touched ${rel}`);
        }
    } finally {
        await fs.rm(probeDir, { recursive: true, force: true });
    }
});

// TC-HOOKMIRROR-001b — the guard itself, named. TC-HOOKMIRROR-001 proves no write
// happened; it cannot say WHY, so a module that stopped writing for an unrelated
// reason (an early return, a main() that moved) would keep it green while the guard
// was gone. Each module must still gate its script entry on being argv[1].
test('TC-HOOKMIRROR-001b: every sync module gates its script entry on invoked-as-script', async () => {
    for (const name of SYNC_MODULES) {
        const source = await fs.readFile(path.resolve(thisDir, '..', name), 'utf8');
        assert.match(
            source,
            /const invokedAsScript =[\s\S]{0,120}?process\.argv\[1\][\s\S]{0,160}?fileURLToPath\(import\.meta\.url\)/,
            `${name} must derive invokedAsScript from process.argv[1] vs its own module URL`
        );
        assert.match(source, /if \(invokedAsScript\) \{/, `${name} must run its script entry only when invoked as a script`);
    }
});

// TC-HOOKMIRROR-002 — the writer is deterministic for hooks.json, so a diff against
// the committed copy means real drift, never run-to-run noise. (The sibling report is
// NOT deterministic — it embeds generated_at — which is why the gate diffs only hooks.json.)
test('TC-HOOKMIRROR-002: hooks.json materializes deterministically; the report does not', async () => {
    const first = await fs.mkdtemp(path.join(os.tmpdir(), 'hookmirror-a-'));
    const second = await fs.mkdtemp(path.join(os.tmpdir(), 'hookmirror-b-'));
    try {
        await materializeHookMirror(first);
        await new Promise(resolve => setTimeout(resolve, 5));
        await materializeHookMirror(second);
        const readHooks = dir => fs.readFile(path.join(dir, 'hooks.json'), 'utf8');
        assert.equal(await readHooks(first), await readHooks(second));

        const report = JSON.parse(await fs.readFile(path.join(first, 'hooks.sync.report.json'), 'utf8'));
        assert.ok(report.generated_at, 'the report carries a timestamp, so it is not byte-comparable');
    } finally {
        await fs.rm(first, { recursive: true, force: true });
        await fs.rm(second, { recursive: true, force: true });
    }
});

// TC-HOOKMIRROR-003 — the gate is non-vacuous: a fresh render of the CURRENT settings
// must produce exactly this hook surface. A render that silently dropped a group, or
// emptied one down to a single hook, would let the gate report PASS while the Codex
// host ran fewer hooks than this project configures.
//
// The expectation is a LITERAL table, MEASURED from a fresh render (2026-09-08), not
// re-derived from settings.json. The previous version rebuilt the expected set by
// applying `matcher && matcher !== '*'` — the renderer's own rule (sync-hooks.mjs:184)
// — to settings.json, so it could only ever check that the renderer applied the rule
// the test had already assumed. It also asserted PreToolUse membership only: an event
// dropped whole, a group lost, or a group thinned from four hooks to one all left it
// green. Anything below is a real change to what a Codex session runs, and updating
// this table is the deliberate act that records the decision.
//
// Rows are `[event, matcher-or-null, hook-count]`; null means the group carries no
// matcher (the renderer omits `*`, so the group still applies to everything).
const EXPECTED_RENDERED_GROUPS = [
    ['PostToolUse', 'Edit|Write|MultiEdit', 1],
    ['PostToolUse', 'Edit|Write|MultiEdit', 1],
    ['PreToolUse', 'AskUserQuestion', 1],
    ['PreToolUse', 'Bash', 4],
    ['PreToolUse', 'Bash|Glob|Grep|Read|Edit|Write|NotebookEdit', 2],
    ['PreToolUse', 'Bash|Edit|Write|MultiEdit|NotebookEdit', 1],
    ['PreToolUse', 'Write|Edit|MultiEdit', 1],
    ['PreToolUse', 'mcp__filesystem__*', 1],
    ['PreToolUse', 'mcp__github__*', 1],
    ['Stop', null, 1],
    ['UserPromptSubmit', null, 1],
    ['UserPromptSubmit', null, 1]
];

test('TC-HOOKMIRROR-003: a fresh render produces exactly the expected hook surface', async () => {
    const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'hookmirror-c-'));
    try {
        await materializeHookMirror(staging);
        const rendered = JSON.parse(await fs.readFile(path.join(staging, 'hooks.json'), 'utf8'));

        const actual = Object.entries(rendered.hooks)
            .flatMap(([event, groups]) => groups.map(group => [event, group.matcher ?? null, group.hooks.length]));

        assert.deepEqual(
            actual,
            EXPECTED_RENDERED_GROUPS,
            'the Codex hook surface changed — a Codex session now runs a different hook set than this table records'
        );

        // Every matcher the source configures still has to survive. The table above
        // would also catch this, but only as an opaque array diff; this names the
        // matcher, which is the sentence a reader needs when it fails.
        const settings = JSON.parse(await fs.readFile(claudeSettingsPath, 'utf8'));
        const renderedMatchers = new Set(actual.map(([, matcher]) => matcher).filter(Boolean));
        for (const group of settings.hooks.PreToolUse || []) {
            if (!group.matcher || group.matcher === '*') continue;
            assert.ok(
                renderedMatchers.has(group.matcher),
                `PreToolUse matcher "${group.matcher}" is configured in settings.json but missing from the Codex mirror`
            );
        }
    } finally {
        await fs.rm(staging, { recursive: true, force: true });
    }
});

// TC-HOOKMIRROR-004 — the skip guard, on SYNTHETIC reports. The gate's byte-diff of
// hooks.json cannot see a dropped hook at all: move a hook to an event Codex does not
// support and the mirror is byte-identical while Codex runs one gate fewer. Only the
// renderer's skip report records it, and that report is gitignored, so nothing else
// compares it. These cases drive the guard through the states that matter — today's
// baseline, a new drop, a changed reason, a dropped group, and a baseline gone stale.
test('TC-HOOKMIRROR-004: the skip guard accepts the reviewed baseline and rejects every drift', () => {
    const BASELINE = [
        { event: 'Notification', reason: 'unsupported-by-codex' },
        { event: 'SessionEnd', reason: 'unsupported-by-codex' },
        { event: 'SessionStart', reason: 'static-startup-context-authoritative' }
    ];

    assert.deepEqual(
        unexpectedHookSkips({ skipped_events: BASELINE, skipped_groups: [] }),
        [],
        'the reviewed baseline must not fail the gate'
    );

    const newSkip = unexpectedHookSkips({
        skipped_events: [...BASELINE, { event: 'PreToolUse', reason: 'unsupported-by-codex' }],
        skipped_groups: []
    });
    assert.equal(newSkip.length, 1);
    assert.match(newSkip[0], /PreToolUse is now skipped/);

    const changedReason = unexpectedHookSkips({
        skipped_events: BASELINE.map(entry =>
            entry.event === 'SessionStart' ? { ...entry, reason: 'no-compatible-groups-after-filtering' } : entry),
        skipped_groups: []
    });
    assert.equal(changedReason.length, 1);
    assert.match(changedReason[0], /SessionStart is skipped for a new reason/);

    const droppedGroup = unexpectedHookSkips({
        skipped_events: BASELINE,
        skipped_groups: [{ event: 'PreToolUse', group_index: 3, matcher: 'Bash', reason: 'no-command-hooks' }]
    });
    assert.equal(droppedGroup.length, 1);
    assert.match(droppedGroup[0], /PreToolUse\[3\].*Bash.*no-command-hooks/);

    // The opposite direction is not a safety loss — MORE is mirrored than before — but
    // it makes the recorded baseline a lie, so it still has to be re-reviewed.
    const staleBaseline = unexpectedHookSkips({
        skipped_events: BASELINE.filter(entry => entry.event !== 'SessionEnd'),
        skipped_groups: []
    });
    assert.equal(staleBaseline.length, 1);
    assert.match(staleBaseline[0], /SessionEnd is no longer skipped/);

    // A renderer that returned no skip fields at all must not read as "nothing skipped":
    // the three baseline events are still expected, so their absence is reported.
    assert.equal(unexpectedHookSkips({}).length, BASELINE.length);
});

// TC-HOOKMIRROR-005 — the guard, wired. TC-HOOKMIRROR-004 proves the function's logic
// on synthetic input; this proves the LIVE renderer's report still satisfies it, so the
// baseline in the gate is the repo's actual state and not an aspiration.
test('TC-HOOKMIRROR-005: the live renderer skips exactly the reviewed set', async () => {
    const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'hookmirror-d-'));
    try {
        const report = await materializeHookMirror(staging);
        assert.deepEqual(unexpectedHookSkips(report), [], 'the live hook render drops hooks the gate has not reviewed');
    } finally {
        await fs.rm(staging, { recursive: true, force: true });
    }
});

// TC-CODEXSYNC-001 — the gate's own remediation sentence, verified. Every FAIL branch tells the
// reader to run `npm run codex:sync` — or, verbatim, the standalone orchestrator it delegates to,
// `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` — and nothing checked that the command
// still regenerates all four surfaces this gate compares. Add a fifth mirror (or drop a generator from
// the roster) and the gate would keep failing while its documented fix no longer repairs what it flags
// — the most expensive kind of stale instruction, because it is followed.
//
// The roster asserted is the RUNNER's `stages` array, NOT package.json's script string. The runner
// lives inside `.claude`, so it is the one roster that exists in every adopting project — PORT-007
// ships no package.json at all — and framework-repo.helper.mjs draws exactly that line: guard the npm
// SURFACE, keep the runner CONTRACT absolute. An earlier version of this test asserted an
// `npm run a && npm run b` chain that `codex:sync` had already stopped being, so it could never pass;
// the npm alias is now checked separately, as the repo self-check it is (TC-CODEXSYNC-002).
//
// The mapping below is keyed by the surfaces checkSkillsMirror / checkAgentMirror / checkHookMirror /
// checkContextMirror actually compare, so it is derived from the gate's coverage, not from the runner
// restating itself.
test('TC-CODEXSYNC-001: the remediation command regenerates every surface this gate checks', async () => {
    const runnerPath = path.join(repoRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
    const runner = await fs.readFile(runnerPath, 'utf8');

    // Slice the literal roster out of the SOURCE instead of importing it: importing the runner would
    // execute the pipeline, and its three mutating stages would rewrite the real tree from a test.
    const open = runner.indexOf('const stages = [');
    assert.notEqual(open, -1, 'run-codex-sync.mjs must define a `stages` roster — it is the remediation every FAIL branch prints');
    const close = runner.indexOf('\n];', open);
    assert.notEqual(close, -1, 'the `stages` roster has no closing `];` — the extraction below cannot be trusted');
    const stages = [...runner.slice(open, close).matchAll(/\{\s*id:\s*"([^"]+)"[^\n]*/g)].map(match => ({ id: match[1], entry: match[0] }));
    assert.ok(stages.length > 0, 'the `stages` roster parsed empty — the runner changed shape and this extraction no longer matches it');

    const GENERATOR_FOR_SURFACE = [
        ['.agents/skills (checkSkillsMirror)', 'migrate', 'migrate-claude-to-codex.mjs'],
        ['.codex/agents (checkAgentMirror)', 'migrate', 'migrate-claude-to-codex.mjs'],
        ['.codex/hooks.json (checkHookMirror)', 'hooks', 'sync-hooks.mjs'],
        ['AGENTS.md + .codex/CODEX_CONTEXT.md (checkContextMirror)', 'context', 'sync-context-workflows.mjs']
    ];

    for (const [surface, id, script] of GENERATOR_FOR_SURFACE) {
        const stage = stages.find(entry => entry.id === id);
        assert.ok(stage, `codex:sync no longer runs the '${id}' stage, so it cannot regenerate ${surface} — the gate's remediation is now wrong`);
        assert.match(
            stage.entry,
            new RegExp(script.replaceAll('.', '\\.')),
            `the '${id}' stage no longer invokes ${script}, so ${surface} is not regenerated by the remediation`
        );
        // `mutate: true` is the marker that classifies a stage as a REGENERATOR: PORT-008
        // (portability-no-package-json.test.mjs) derives the read-only verify set as every stage
        // WITHOUT it. A generator that loses the marker is reclassified as read-only and lands in the
        // `verify:all --only=` allowlist, so the npm verify path would run it as if it regenerated
        // nothing.
        assert.match(stage.entry, /mutate:\s*true/, `the '${id}' stage is no longer a mutating stage, so it regenerates nothing for ${surface}`);
    }

    // Verification runs LAST on purpose: a sync that regenerates without re-verifying reports success
    // on output nothing checked. THIS gate is that last stage, so the remediation it prints is never
    // judged against the stale tree it was printed about.
    const gateIndex = stages.findIndex(entry => entry.id === 'sync-divergence');
    assert.notEqual(gateIndex, -1, "the roster must end by re-running this gate ('sync-divergence')");
    assert.equal(
        gateIndex,
        stages.length - 1,
        'verify-sync-divergence must be the LAST stage — verification before the final generator proves nothing'
    );
    const lastGeneratorIndex = Math.max(...GENERATOR_FOR_SURFACE.map(([, id]) => stages.findIndex(entry => entry.id === id)));
    assert.ok(lastGeneratorIndex < gateIndex, 'every generator must run BEFORE the verification stage, or the gate verifies output it has not regenerated');
});

// TC-CODEXSYNC-002 — the npm alias the remediation names still resolves to the roster TC-CODEXSYNC-001
// verified. Framework-repo-only on purpose: an adopting project keeps its own package.json, or has none
// at all, so what THIS repo's scripts say is a self-check of its own surface and not part of the
// portable contract — the split framework-repo.helper.mjs mandates.
test('TC-CODEXSYNC-002: `npm run codex:sync` delegates to the verified roster', { skip: !isFrameworkRepo(repoRoot) }, async () => {
    const pkg = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));
    const script = pkg.scripts?.['codex:sync'];
    assert.ok(script, 'package.json must define codex:sync — the remediation every FAIL branch prints');
    assert.match(
        script,
        /run-codex-sync\.mjs/,
        '`npm run codex:sync` no longer delegates to run-codex-sync.mjs, so the remediation names a command no test verifies'
    );
});
