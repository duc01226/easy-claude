// upgrade-contract.mjs: upstream, a consumer-facing change cannot land without an upgrade entry or a
// waiver that covers its new hash; in a consumer project the check never runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import { spawnSync } from 'node:child_process';
import { surfaceHashes, evaluateContract, readEntries, readSnapshot, isUpstreamRepo, SNAPSHOT_PATH } from '../upgrade-contract.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, '..', 'upgrade-contract.mjs');
const ROOT = path.resolve(HERE, '..', '..', '..');
const SCHEMA_FILE = '.claude/hooks/lib/project-config-schema.cjs';

const schemaModule = (schema, modes = ['off', 'on']) =>
    `module.exports = { SCHEMA: ${JSON.stringify(schema, null, 2)}, ROUTE_MODES: ${JSON.stringify(modes)}, check() {} };\n`;
const baseSchema = () => ({
    _description: 'notes are not a surface',
    testing: {
        type: 'object',
        describe: 'Test commands',
        properties: { commands: { type: 'map', describe: 'Commands by name' } }
    },
    reviewGate: { type: 'object', properties: { mode: { type: 'string', enumValues: ['off', 'warn'], default: 'off' } } }
});

function fixture(t, { packageName = 'easy-claude-tooling' } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'upgrade-contract-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const write = (file, text) => {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), text);
    };
    write('package.json', JSON.stringify({ name: packageName, private: true }));
    write(SCHEMA_FILE, schemaModule(baseSchema()));
    write(
        '.claude/workflows.json',
        JSON.stringify({ workflows: { 'workflow-fix': { description: 'Fix a bug', sequence: [{ id: 'fix', skill: 'fix', role: 'gate' }] } } })
    );
    write('.claude/settings.json', JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node .claude/hooks/stop.cjs' }] }] } }));
    write('.claude/skills/fix/SKILL.md', '---\nname: fix\n---\n');
    write('.claude/skills/scan/SKILL.md', '---\nname: scan\n---\n');
    write(
        '.claude/skills/scan/references/targets.md',
        '| Key | Doc | File |\n| --- | --- | --- |\n| `lessons` | `<ref>/lessons.md` | `targets/lessons.md` |\n'
    );
    const run = (...args) => {
        const result = spawnSync(process.execPath, [SCRIPT, `--root=${root}`, ...args], { encoding: 'utf8' });
        return { code: result.status, out: result.stdout, err: result.stderr };
    };
    const evaluate = () => evaluateContract({ current: surfaceHashes(root), snapshot: readSnapshot(root), entries: readEntries(root) });
    const notice = (id, covers) =>
        write(
            `.claude/upgrades/actions/${id}.md`,
            `---\nid: ${id}\nkind: notice\ntitle: About ${id}\nadded: 2026-11-16\ncovers:\n${covers.map(cover => `  - ${cover}\n`).join('')}---\n\nTell the user about ${id}.\n`
        );
    assert.equal(run('--init').code, 0, 'the first snapshot is the baseline');
    return { root, write, run, evaluate, notice, hashes: () => surfaceHashes(root) };
}

test(
    'this framework repository: every consumer-facing change since the baseline ships an upgrade entry or a waiver [TC-FWU-011]',
    { skip: !isUpstreamRepo(ROOT) && 'upstream-only: this is a consumer project' },
    () => {
        const { problems } = evaluateContract({ current: surfaceHashes(ROOT), snapshot: readSnapshot(ROOT), entries: readEntries(ROOT) });
        assert.deepEqual(
            problems.map(problem => `${problem.subject}: ${problem.message}`),
            []
        );
    }
);

test('a changed config section, default or enum fails until an entry covers its new hash, and the refresh then records it [TC-FWU-011]', t => {
    const f = fixture(t);
    assert.equal(f.run().code, 0);
    const before = f.hashes()['config:reviewGate'];
    const schema = baseSchema();
    schema.reviewGate.properties.mode.enumValues.push('enforce');
    f.write(SCHEMA_FILE, schemaModule(schema));
    const after = f.hashes()['config:reviewGate'];
    assert.notEqual(after, before, 'a new enum value is a new hash');
    const red = f.run();
    assert.equal(red.code, 1);
    assert.match(
        red.out,
        new RegExp(`config:reviewGate changed \\(snapshot ${before}, now ${after}\\) and no upgrade action, notice or waiver covers config:reviewGate@${after}`)
    );
    assert.match(
        red.out,
        /Consumer projects would receive this change through \/framework-update with no instruction for their agent/,
        'the message says why it matters'
    );
    assert.match(red.out, new RegExp(`Fix: add an action .* with covers: \\[config:reviewGate@${after}\\]`), 'and how to fix it');
    f.notice('gate-modes', [`config:reviewGate@${after}`]);
    const unrecorded = f.run();
    assert.equal(unrecorded.code, 1);
    assert.match(unrecorded.out, /is covered by gate-modes but not recorded yet; run node \.claude\/scripts\/upgrade-contract\.mjs --refresh/);
    assert.equal(f.run('--refresh').code, 0);
    assert.equal(f.run().code, 0);
    assert.deepEqual(readSnapshot(f.root).surfaces['config:reviewGate'], { hash: after, by: 'gate-modes' });
    schema.reviewGate.properties.mode.default = 'warn';
    f.write(SCHEMA_FILE, schemaModule(schema));
    assert.equal(f.run().code, 1, 'a changed default is a change too, and the old cover does not reach the new hash');
});

test('reworded prose is not a change; a new workflow step, hook, scan target or skill is [TC-FWU-011]', t => {
    const f = fixture(t);
    const before = f.hashes();
    const schema = baseSchema();
    schema.testing.describe = 'Commands that test the project';
    schema._description = 'reworded note';
    f.write(SCHEMA_FILE, schemaModule(schema));
    f.write(
        '.claude/workflows.json',
        JSON.stringify({ workflows: { 'workflow-fix': { description: 'Fix bugs well', sequence: [{ id: 'fix', skill: 'fix', role: 'gate' }] } } })
    );
    assert.deepEqual(f.hashes(), before, 'descriptions are prose');
    f.write(
        '.claude/workflows.json',
        JSON.stringify({
            workflows: {
                'workflow-fix': {
                    sequence: [
                        { id: 'fix', skill: 'fix', role: 'gate' },
                        { id: 'prevent', skill: 'fix', args: '--mode=prevent', role: 'gate' }
                    ]
                }
            }
        })
    );
    f.write('.claude/settings.json', JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node .claude/hooks/other.cjs' }] }] } }));
    f.write(
        '.claude/skills/scan/references/targets.md',
        '| `lessons` | `<ref>/lessons.md` | `targets/lessons.md` |\n| `feature-map` | `<ref>/feature-map.md` | `targets/feature-map.md` |\n'
    );
    f.write('.claude/skills/verify/SKILL.md', '---\nname: verify\n---\n');
    f.write(SCHEMA_FILE, schemaModule(schema, ['off', 'on', 'auto']));
    const after = f.hashes();
    for (const surface of ['workflow:workflow-fix', 'hooks:Stop', 'scan-targets', 'skills', 'config:ROUTE_MODES'])
        assert.notEqual(after[surface], before[surface], surface);
    assert.deepEqual(
        f
            .evaluate()
            .problems.filter(problem => problem.kind === 'uncovered')
            .map(problem => problem.subject)
            .sort(),
        ['config:ROUTE_MODES', 'hooks:Stop', 'scan-targets', 'skills', 'workflow:workflow-fix']
    );
});

test('a refresh without a cover is refused and the check stays red [TC-FWU-012]', t => {
    const f = fixture(t);
    f.write('.claude/skills/verify/SKILL.md', '---\nname: verify\n---\n');
    const snapshot = fs.readFileSync(path.join(f.root, SNAPSHOT_PATH), 'utf8');
    const refused = f.run('--refresh');
    assert.equal(refused.code, 1);
    assert.match(refused.out, /refresh refused; 1 problem\(s\) must be fixed first/);
    assert.equal(fs.readFileSync(path.join(f.root, SNAPSHOT_PATH), 'utf8'), snapshot, 'the snapshot is unchanged');
    assert.equal(f.run().code, 1);
});

test('a hash pasted into the snapshot by hand, with nothing covering it, fails [TC-FWU-012]', t => {
    const f = fixture(t);
    f.write('.claude/skills/verify/SKILL.md', '---\nname: verify\n---\n');
    const snapshot = readSnapshot(f.root);
    const now = f.hashes().skills;
    snapshot.surfaces.skills.hash = now;
    f.write(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
    const red = f.run();
    assert.equal(red.code, 1);
    assert.match(red.out, new RegExp(`records skills@${now} as accepted by "baseline", but nothing by that name accepts that hash`));
    snapshot.surfaces.skills.by = 'made-up';
    f.write(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
    assert.match(f.run().out, /accepted by "made-up", but nothing by that name accepts that hash/);
});

test('a waiver with a reason covers a change no consumer acts on; one without a reason is rejected; a removal needs its own cover [TC-FWU-012]', t => {
    const f = fixture(t);
    const schema = baseSchema();
    schema.testing.properties.commands.itemType = 'string';
    f.write(SCHEMA_FILE, schemaModule(schema));
    const cover = `config:testing@${f.hashes()['config:testing']}`;
    const snapshot = readSnapshot(f.root);
    snapshot.waivers.push({ covers: [cover] });
    f.write(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
    assert.match(f.run('--refresh').out, /a waiver needs "covers" \(surface@hash values\) and a "reason"/);
    snapshot.waivers[0].reason = 'internal validation detail; consumer configs stay valid';
    f.write(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
    assert.equal(f.run('--refresh').code, 0);
    assert.equal(f.run().code, 0);
    assert.equal(readSnapshot(f.root).surfaces['config:testing'].by, 'waiver');
    fs.rmSync(path.join(f.root, '.claude/settings.json'));
    assert.match(f.run().out, /hooks:Stop was removed \(snapshot [0-9a-f]{12}, now absent\) .* covers hooks:Stop@absent/);
    f.notice('stop-hook-retired', ['hooks:Stop@absent']);
    assert.equal(f.run('--refresh').code, 0);
    assert.equal(f.run().code, 0);
    assert.equal(readSnapshot(f.root).surfaces['hooks:Stop'], undefined, 'a removed surface leaves the snapshot');
});

test('broken entries fail the check upstream with the fix named [TC-FWU-009]', t => {
    const f = fixture(t);
    f.write('.claude/upgrades/actions/broken.md', '---\nid: broken\nkind: action\n---\n');
    f.write(
        '.claude/upgrades/actions/late.md',
        '---\nid: late\nkind: action\ntitle: Late\nadded: 2026-11-16\nlevel: optional\nafter:\n  - missing\n---\n\n## Steps\n\n1. Run `/fix` (consent: no).\n'
    );
    const red = f.run();
    assert.equal(red.code, 1);
    assert.match(red.out, /broken\.md: .*title must be one line of text\. A consumer's update lists a broken entry as "cannot be read"/);
    assert.match(red.out, /late runs after missing, which no entry in \.claude\/upgrades\/actions\/ has/);
});

test('in a consumer project with its own skills and hooks the check skips, whatever the snapshot says [TC-FWU-013]', t => {
    const f = fixture(t, { packageName: 'acme-app' });
    // A vendoring project points the shared framework-repo guard at its own package; this check still skips.
    f.write('docs/project-config.json', JSON.stringify({ project: { name: 'acme' }, portability: { toolingPackageName: 'acme-app' } }));
    f.write('.claude/skills/acme-deploy/SKILL.md', '---\nname: acme-deploy\n---\n');
    f.write('.claude/settings.json', JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node .claude/hooks/acme.cjs' }] }] } }));
    const result = f.run();
    assert.equal(result.code, 0, result.err);
    assert.match(result.out, /skipped; this is not the upstream framework repository/);
    assert.equal(fs.existsSync(path.join(f.root, SNAPSHOT_PATH)), false, '--init skipped too');
    assert.equal(isUpstreamRepo(f.root), false, 'the live-repo test above skips there too, so a consumer sync never runs it');
});

test('a retired notice is replaced by a waiver that names it, and the refresh moves the record to the waiver [TC-FWU-012]', t => {
    const f = fixture(t);
    f.write('.claude/skills/verify/SKILL.md', '---\nname: verify\n---\n');
    const cover = `skills@${f.hashes().skills}`;
    f.notice('verify-skill', [cover]);
    assert.equal(f.run('--refresh').code, 0);
    fs.rmSync(path.join(f.root, '.claude/upgrades/actions/verify-skill.md'));
    const red = f.run();
    assert.equal(red.code, 1, 'the record names a notice that is gone');
    assert.match(red.out, /A notice retired after 180 days is replaced by a waiver whose reason names it/);
    const snapshot = readSnapshot(f.root);
    snapshot.waivers.push({ covers: [cover], reason: 'covered by the retired notice verify-skill' });
    f.write(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
    assert.match(f.run().out, /is now covered by a waiver, not "verify-skill"/);
    assert.equal(f.run('--refresh').code, 0);
    assert.equal(f.run().code, 0);
    assert.equal(readSnapshot(f.root).surfaces.skills.by, 'waiver');
});
