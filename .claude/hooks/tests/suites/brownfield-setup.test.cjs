/**
 * Brownfield Setup Test Suite
 *
 * Guards the setup skills on existing projects: `linter-setup` adds checks with a ratchet baseline and a
 * Restricted APIs category, `harness-setup` owns a committed harness inventory with a runtime row,
 * `project-init` reports that inventory and offers setup only on a yes, `project-config` fills
 * `architectureRules` from evidence, and reviewers read the boundary tool once it is declared.
 * These are agent-guidance contracts with no business spec (prose-only guidance gets no business test
 * case); each row pins the sentence that carries the behavior, so moving or weakening it goes red.
 *
 * Coverage:
 *   BFS-001 — `architectureRules.enforcedBy` is optional and closed; `tool` and `config` are required.
 *   BFS-002 — brownfield ratchet rules: historical debt stays green; security is separate, the baseline only shrinks, the hook writes
 *             nothing, no mass rewrite, and an unknown repository shape is proposed, never applied.
 *   BFS-003 — config placement decided for single-package, npm/Yarn and pnpm workspaces and unknown shapes.
 *   BFS-004 — the native-baseline table covers JS/TS, Python, a compiled stack, and the command-level fallback.
 *   BFS-005 — Restricted APIs: evidence-only bans, fix-naming messages, wrapper-only exceptions,
 *             baselined existing uses; the architecture review mirrors the category.
 *   BFS-006 — tool questions: plain words, recommended option first, one per category, never auto-select.
 *   BFS-007 — harness inventory: committed path under the project-reference root, read-only detection,
 *             the four runtime values, and the runtime row never triggers an offer by itself.
 *   BFS-008 — project-init reports the inventory and offers brownfield setup, installing nothing without a yes.
 *   BFS-009 — project-config fills architectureRules from evidence, never from folder names, and hands
 *             enforcement to a tool; both review owners prefer the declared tool over grepping imports.
 *   BFS-010 — the two upgrade entries parse with the update engine: recommended inventory offer, optional
 *             architecture-rules action covering the architectureRules surface, both with done checks.
 *
 * Portability: every row reads framework-owned files that ship inside `.claude/` and requires the schema
 * module and the update engine from there; no project config, docs or git state is read. The engine is
 * loaded by file URL, so the path works on Windows, macOS and Linux. Nothing is written.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const CLAUDE = path.join(__dirname, '..', '..', '..');
const read = (...parts) => fs.readFileSync(path.join(CLAUDE, ...parts), 'utf8');
const skill = (name, ...rest) => read('skills', name, ...(rest.length ? rest : ['SKILL.md']));
const { validateConfig } = require(path.join(CLAUDE, 'hooks', 'lib', 'project-config-schema.cjs'));

const BASE = { project: { name: 'sample-project' } };
const ruleErrors = rules => (validateConfig({ ...BASE, architectureRules: rules }).errors || []).filter(e => e.startsWith('architectureRules'));

// Table rows with cell padding removed, so a formatter re-padding a table never fails a pin.
const tableRows = text =>
    text
        .split('\n')
        .filter(line => line.startsWith('|'))
        .map(
            line =>
                `| ${line
                    .slice(1, line.endsWith('|') ? -1 : undefined)
                    .split('|')
                    .map(cell => cell.trim())
                    .join(' | ')} |`
        );

const includesAll = (text, phrases, where) => {
    const missing = phrases.filter(phrase => !text.includes(phrase));
    assert.deepEqual(missing, [], `${where} lost: ${missing.join(' | ')}`);
};

const tests = [
    {
        name: '[brownfield-setup] BFS-001 architectureRules.enforcedBy is optional and closed, with tool and config required',
        fn: () => {
            const boundaries = [{ layer: 'domain', paths: ['src/domain/**'], cannotImportFrom: ['infrastructure'] }];
            assert.deepEqual(ruleErrors({ layerBoundaries: boundaries }), [], 'rules without a tool still load');
            assert.deepEqual(
                ruleErrors({
                    layerBoundaries: boundaries,
                    enforcedBy: { tool: 'boundary-tool', config: 'boundaries.config.js', command: 'npm run lint:boundaries' }
                }),
                [],
                'a declared tool loads'
            );
            for (const [enforcedBy, expected] of [
                [{ tool: 'boundary-tool' }, 'architectureRules.enforcedBy.config: required field is missing'],
                [{ config: 'boundaries.config.js' }, 'architectureRules.enforcedBy.tool: required field is missing'],
                [{ tool: 'boundary-tool', config: 'boundaries.config.js', cmd: 'x' }, 'architectureRules.enforcedBy.cmd: unknown property'],
                [{ tool: 'boundary-tool', config: 7 }, 'architectureRules.enforcedBy.config: expected string']
            ]) {
                const errors = ruleErrors({ layerBoundaries: boundaries, enforcedBy });
                assert.ok(
                    errors.some(e => e.startsWith(expected)),
                    `refused with the setting named: ${expected} — got ${JSON.stringify(errors)}`
                );
            }
        }
    },
    {
        name: '[brownfield-setup] BFS-002 historical debt ratchets while security risks and unproven controls retain explicit treatment',
        fn: () => {
            const text = skill('linter-setup', 'references', 'brownfield-ratchet.md');
            includesAll(
                text,
                [
                    "**Never make the existing tree red for historical style/correctness debt.** Every new check lands with a frozen baseline of today's violations and fails only on new ones.",
                    '**Security risk is separate.**',
                    'Live credentials, authorization bypass, malicious components and exploitable high-consequence paths',
                    'a regression baseline cannot silently accept them',
                    'static analysis, secret scan, dependency scan',
                    'Use the statuses defined by the inventory owner.',
                    'select `failed`, `blocked`, `unverified` and `not-run` for proof, remediation or explicit owner escalation',
                    'preserve the recorded outcome',
                    'never turn unavailable/failed evidence into a clean result or silently baseline security risk',
                    '**The baseline only shrinks (ratchet).**',
                    'Never add an entry to make a change pass',
                    '**Keep what the project already runs.**',
                    '**No mass rewrite in the setup commit.**',
                    "**Unknown repository shape → propose, don't apply.**",
                    'The pre-commit hook checks staged files only and writes nothing: no auto-fix, no baseline update.',
                    'a baselined violation still passes, a new violation of the same rule fails',
                    'Never probe in the working repository.'
                ],
                'brownfield-ratchet.md'
            );
            const main = skill('linter-setup');
            includesAll(
                main,
                ['`references/brownfield-ratchet.md`', '`--mode=brownfield` forces that path', 'existing source code selects the brownfield path'],
                'linter-setup SKILL.md routing'
            );
        }
    },
    {
        name: '[brownfield-setup] BFS-003 config placement is decided per repository shape, and unknown shapes wait for the user',
        fn: () => {
            const text = skill('linter-setup', 'references', 'brownfield-ratchet.md');
            const rows = tableRows(text);
            const row = label => rows.find(line => line.startsWith(`| ${label}`)) || '';
            assert.match(row('Single package'), /one tool config and one baseline at the root/);
            assert.match(row('npm or Yarn workspaces'), /`workspaces` in the root `package.json`.*one root baseline.*CI runs it once from the root/);
            assert.match(row('pnpm workspaces'), /`pnpm-workspace\.yaml`/);
            assert.match(row('A package already has its own config'), /keep it; extending it from a shared root config needs the user's yes/);
            assert.match(row('Unknown or mixed'), /propose a placement with its evidence; do not apply until the user agrees/);
        }
    },
    {
        name: '[brownfield-setup] BFS-004 the native-baseline table covers JS/TS, Python, a compiled stack and the command-level fallback',
        fn: () => {
            const text = skill('linter-setup', 'references', 'brownfield-ratchet.md');
            const rows = tableRows(text);
            const has = (pattern, why) =>
                assert.ok(
                    rows.some(line => pattern.test(line)),
                    why
                );
            has(/^\| JS \/ TS \| ESLint .*`eslint-suppressions\.json`.*`eslint \. --prune-suppressions`/, 'ESLint bulk suppressions with its prune command');
            has(/^\| Python \| Ruff .*`ruff check --add-noqa`/, 'Ruff inline suppressions');
            has(/^\| Kotlin \(compiled\) \| detekt .*`detektBaseline`/, 'a compiled stack with a native baseline');
            has(/^\| Go \(compiled\) \| golangci-lint .*`issues\.new-from-rev`/, 'a compiled stack with a diff ratchet');
            has(/^\| Any other tool .*none known → command-level baseline/, 'the fallback for stacks with no mechanism');
            includesAll(
                text,
                [
                    '**Command-level baseline.**',
                    '`testing.commands.lint`',
                    'Only setup, an explicit prune and a consented rule adoption change it; a pre-commit hook or a verify run never writes it.'
                ],
                'command-level baseline rule'
            );
        }
    },
    {
        name: '[brownfield-setup] BFS-005 Restricted APIs bans come from evidence, name the fix and exempt only the wrapper',
        fn: () => {
            const main = skill('linter-setup');
            assert.match(main, /\| \*\*Restricted APIs\*\* +\| Ban a raw API the project wraps or forbids; the error names the wrapper to use \|/);
            includesAll(
                main,
                [
                    '### Restricted APIs (Architecture Fitness detail)',
                    '**Candidates come from evidence only:**',
                    'Never invent a ban.',
                    '**The message names the fix:**',
                    "**Wrapper-only exceptions:** exempt only the wrapper's own files with a file-scoped override",
                    'Never exempt a whole directory to make the rule pass.',
                    '**Existing uses go into the baseline**',
                    '`N/A — no wrapper or banned-API rule evidenced`'
                ],
                'linter-setup Restricted APIs'
            );
            const review = skill('architecture', 'references', 'mode-review.md');
            includesAll(
                review,
                [
                    '## Restricted API Check',
                    'Mirror of `/linter-setup` → Restricted APIs.',
                    'propose a ban whose message names that wrapper, with wrapper-only exceptions'
                ],
                'architecture review mirror'
            );
        }
    },
    {
        name: '[brownfield-setup] BFS-006 tool questions use plain words, put the recommended option first and never auto-select',
        fn: () => {
            const main = skill('linter-setup');
            includesAll(
                main,
                [
                    '### Asking the user',
                    "Tool choice stays the team's: never auto-select.",
                    '**One plain sentence on what the category catches**',
                    '**Options ordered recommended first.** The first is labelled `(Recommended)`',
                    '**A last `Skip for now` option**',
                    'One question per category; never fold several categories into one bundled choice.',
                    'Present via `ask user question tool` in the **Asking the user** format below'
                ],
                'linter-setup question format'
            );
        }
    },
    {
        name: '[brownfield-setup] BFS-007 the harness inventory is committed, detected read-only and carries an informational runtime row',
        fn: () => {
            const text = skill('harness-setup', 'references', 'harness-inventory.md');
            includesAll(
                text,
                [
                    '`harness-inventory.md` under the project-reference root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)',
                    '**Detecting writes nothing.**',
                    'any other caller (`/project-init`, `/linter-setup`) asks the user before creating or changing it',
                    'Unknown is a gap, never a pass.',
                    'It is informational: it never triggers a setup offer by itself.'
                ],
                'harness-inventory.md'
            );
            for (const [value, evidence] of [
                ['configured', '`experienceVerification.surfaces[].localRun` is declared'],
                ['derivable', 'a manifest script, compose file or documented command starts the app'],
                ['none', 'the project has a runnable surface'],
                ['not-applicable', 'evidence shows no runnable surface']
            ])
                assert.ok(
                    tableRows(text).some(line => line.startsWith(`| \`${value}\` | ${evidence}`)),
                    `runtime value ${value} with its evidence rule`
                );
            const harness = skill('harness-setup');
            assert.ok(!harness.includes('Write `tmp/harness/harness-inventory.md`'), 'the inventory is no longer written under tmp/');
            includesAll(harness, ['- Harness inventory: `harness-inventory.md` under the project-reference root'], 'harness-setup output');
        }
    },
    {
        name: "[brownfield-setup] BFS-008 project-init reports the inventory and installs nothing without the user's yes",
        fn: () => {
            const text = skill('project-init');
            includesAll(
                text,
                [
                    '**Harness inventory and setup offer** — read `.claude/skills/harness-setup/references/harness-inventory.md` and detect each sensor read-only: no tool runs, no file is written.',
                    '`/linter-setup --mode=brownfield` (recommended on an existing project',
                    'For each computational sensor that is `missing`, or `configured` but not yet proven, offer setup',
                    'Run the chosen skill only on a yes; record a no as `declined`',
                    "Save the inventory to its committed path only on the user's yes.",
                    '11. Run the harness inventory (read-only), report it, and offer setup for missing sensors; record each answer.'
                ],
                'project-init harness offer'
            );
        }
    },
    {
        name: '[brownfield-setup] BFS-009 architectureRules come from evidence and reviewers prefer the declared tool',
        fn: () => {
            const config = skill('project-config', 'references', 'architecture-rules-config.md');
            includesAll(
                config,
                [
                    '**Never invent a boundary.**',
                    'Folder names alone (`domain`, `infra`) are not evidence.',
                    "**Preview, then merge on the user's yes,**",
                    "those imports go into the tool's baseline, never silently allowed",
                    'records `architectureRules.enforcedBy`'
                ],
                'architecture-rules-config.md'
            );
            assert.ok(
                skill('project-config').includes('(references/architecture-rules-config.md) when the task fills or reviews `architectureRules`'),
                'project-config routes to it'
            );
            for (const [owner, text] of [
                ['code-quality-review conditional checks', skill('code-quality-review', 'references', 'code-quality-review-conditional-checks.md')],
                ['architecture review mode', skill('architecture', 'references', 'mode-review.md')]
            ])
                includesAll(
                    text,
                    [
                        '**Prefer the tool.** When `architectureRules.enforcedBy` is declared, run its `command`',
                        'Use the steps below only when no tool is declared or it cannot run here'
                    ],
                    owner
                );
        }
    },
    {
        name: '[brownfield-setup] BFS-010 the two upgrade entries parse with the update engine and carry done checks',
        fn: async () => {
            const engine = await import(pathToFileURL(path.join(CLAUDE, 'scripts', 'framework-update.mjs')).href);
            const entry = id => engine.parseUpgradeEntry(read('upgrades', 'actions', `${id}.md`), `${id}.md`);
            const offer = entry('offer-harness-inventory');
            assert.equal(offer.kind, 'action');
            assert.equal(offer.level, 'recommended');
            assert.ok(Array.isArray(offer.done) && offer.done[0] === 'node', 'a done check keeps a second run from redoing it');
            assert.ok(
                offer.steps.some(step => /`\/linter-setup --mode=brownfield`/.test(step.text) && step.consent === true),
                'setup is offered with consent'
            );
            const fill = entry('fill-architecture-rules');
            assert.equal(fill.level, 'optional');
            assert.deepEqual(fill.after, ['offer-harness-inventory']);
            assert.ok(
                fill.covers.some(cover => cover.startsWith('config:architectureRules@')),
                'covers the architectureRules surface'
            );
            assert.ok(
                fill.steps.every(step => step.consent === true),
                'every step asks first'
            );
        }
    }
];

module.exports = { name: 'brownfield-setup', tests };
