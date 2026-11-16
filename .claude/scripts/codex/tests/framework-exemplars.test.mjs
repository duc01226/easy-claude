// Business intent (principle: existing work is the strongest instruction): agents copy the code they
// see, so this repository names one lint-clean exemplar per most-copied kind in
// docs/project-reference/project-structure-reference.md ("Exemplars to Copy"). An exemplar that
// disappears, or that gains an ESLint baseline entry, would teach the pattern the baseline freezes.
// Upstream-only: an adopting project names its own exemplars.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isFrameworkRepo } from './framework-repo.helper.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..', '..');
const REQUIRED_KINDS = ['Hook', 'Hook library', 'Skill', 'Scripts test'];

export function readExemplars(markdown) {
    const section = markdown.split(/^## Exemplars to Copy\s*$/m)[1]?.split(/^## /m)[0] ?? '';
    return section
        .split('\n')
        .map(line => line.match(/^\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|/))
        .filter(Boolean)
        .map(([, kind, file]) => ({ kind, file }));
}

test('each most-copied kind names an existing, lint-clean exemplar', { skip: !isFrameworkRepo(repoRoot) }, () => {
    const doc = fs.readFileSync(path.join(repoRoot, 'docs', 'project-reference', 'project-structure-reference.md'), 'utf8');
    const exemplars = readExemplars(doc);
    assert.deepEqual(
        exemplars.map(entry => entry.kind),
        REQUIRED_KINDS,
        'project-structure-reference.md "Exemplars to Copy" must name one exemplar per kind'
    );
    const baseline = JSON.parse(fs.readFileSync(path.join(repoRoot, 'eslint-suppressions.json'), 'utf8'));
    for (const { kind, file } of exemplars) {
        assert.ok(fs.existsSync(path.join(repoRoot, file)), `${kind} exemplar ${file} no longer exists: name a new one`);
        // A skill exemplar is its folder: none of its scripts may carry a baseline entry either.
        const scope = kind === 'Skill' ? `${path.posix.dirname(file)}/` : file;
        const frozen = Object.keys(baseline).filter(entry => entry === scope || entry.startsWith(scope));
        assert.deepEqual(frozen, [], `${kind} exemplar ${file} has lint-baseline entries, so it is no longer precedent: fix them or name another exemplar`);
    }
});

test('the exemplar table reader returns kind and path per row', () => {
    const sample = ['## Exemplars to Copy', '', '| Kind | Exemplar | Copy this |', '| --- | --- | --- |', '| Hook | `a/b.cjs` | x |', '', '## Next'].join('\n');
    assert.deepEqual(readExemplars(sample), [{ kind: 'Hook', file: 'a/b.cjs' }]);
});
