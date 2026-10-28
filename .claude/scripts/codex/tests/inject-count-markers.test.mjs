// The sync's `counts` stage (`inject-count-markers.mjs`) fills the COUNT markers (ADR-0002) of the
// documents listed in `.claude/scripts/lib/count-marker-files.cjs`, through the catalog tool, before
// any gate reads them. These tests pin which documents it touches and how a failure surfaces; the
// count values themselves are covered by the count-drift suite, which owns the catalog tool's kinds.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { injectCountMarkers } from '../inject-count-markers.mjs';

const require = createRequire(import.meta.url);
const { countMarkerFiles } = require('../../lib/count-marker-files.cjs');
const loader = require('../../../hooks/lib/project-config-loader.cjs');

function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'count-stage-'));
    const write = (rel, text) => {
        const file = path.join(root, ...rel.split('/'));
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
    };
    return { root, write };
}

test('TC-COUNTS-001 injects only listed documents that exist and carry a COUNT marker', () => {
    // Given a listed document with a marker, a listed one without, a listed one that is missing,
    // and an unlisted one with a marker (a decision record quoting an example).
    const { root, write } = fixture();
    try {
        write('docs/with-marker.md', 'Hooks: <!-- COUNT:hooks -->0<!-- /COUNT -->\n');
        write('docs/plain.md', 'No markers here.\n');
        write('docs/adr/example.md', 'Example: <!-- COUNT:hooks -->7<!-- /COUNT -->\n');
        const calls = [];

        // When the stage runs over the list.
        const results = injectCountMarkers({
            rootDir: root,
            files: ['docs/with-marker.md', 'docs/plain.md', 'docs/missing.md'],
            runInject: file => {
                calls.push(path.relative(root, file).split(path.sep).join('/'));
                return { status: 0, stderr: '✓ Updated 1 marker(s)' };
            }
        });

        // Then only the listed document with a marker reaches the catalog tool, and every listed
        // document is accounted for; the unlisted example is never touched.
        assert.deepEqual(calls, ['docs/with-marker.md']);
        assert.deepEqual(results.map(result => [result.file, result.status]), [
            ['docs/with-marker.md', 'injected'],
            ['docs/plain.md', 'no-markers'],
            ['docs/missing.md', 'missing']
        ]);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('TC-COUNTS-002 a failed injection names the document and carries the tool output', () => {
    // Given a listed document whose injection fails (for example: no git file list).
    const { root, write } = fixture();
    try {
        write('docs/index.md', 'Total: <!-- COUNT:markdown:authored -->0<!-- /COUNT -->\n');

        // When the catalog tool exits non-zero, then the stage throws with both the file and the reason,
        // so the sync's abort line says what to fix instead of only "exit 1".
        assert.throws(
            () => injectCountMarkers({
                rootDir: root,
                files: ['docs/index.md'],
                runInject: () => ({ status: 1, stderr: 'ValueError: the markdown count kind needs git' })
            }),
            error => /docs\/index\.md/.test(error.message) && /needs git/.test(error.message)
        );
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('TC-COUNTS-003 the count-bearing list follows a relocated project-reference root', () => {
    // Intent: a project that moves its reference docs still has its docs-index and structure
    // reference filled and checked; both the counts stage and count-drift read this one list.
    const { root, write } = fixture();
    try {
        // Given a project config that relocates the project-reference docs (docs/project-config.json).
        write('docs/project-config.json', JSON.stringify({ project: { name: 'fixture' }, docsRoots: { projectReference: { path: 'handbook/reference' } } }));

        // When the list is resolved for that project.
        const files = countMarkerFiles(root);

        // Then both reference documents come from the relocated root, and nothing from the default.
        const fallback = loader.getDocsRoot('projectReference', {});
        assert.ok(files.includes('handbook/reference/docs-index-reference.md'), JSON.stringify(files));
        assert.ok(files.includes('handbook/reference/project-structure-reference.md'), JSON.stringify(files));
        assert.ok(!files.some(file => file.startsWith(`${fallback}/`)), `no entry may stay under ${fallback}/`);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
