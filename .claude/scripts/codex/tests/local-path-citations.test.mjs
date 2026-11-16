// Business intent: a tracked doc, spec or skill must not cite a local-only file — a report under
// tmp/ or a plan under plans/ — as a source or as evidence. Those folders are gitignored, so the
// citation is a dead link in every clean checkout. Naming the convention ("reports go under
// tmp/reports/{skill}-{date}.md") is fine; citing one concrete file is not.
//
// Existing citations are frozen in local-path-citations.baseline.json (a ratchet): a new one fails,
// and a fixed one must be removed from the baseline so it cannot come back. Upstream-only: an adopting
// project's own docs follow its own conventions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isFrameworkRepo } from './framework-repo.helper.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..', '..');
const baselinePath = path.join(here, 'local-path-citations.baseline.json');

// A concrete local-only file: under tmp/, temp/ or plans/, with a file extension.
const LOCAL_FILE = /((?:tmp|temp|plans)\/[A-Za-z0-9._/-]*[A-Za-z0-9_-]\.(?:md|json|jsonl|log|html|png|jpg|txt|yaml|yml|csv))(?![A-Za-z0-9])/g;
// It is a citation when it names a report or a plan, or carries a date stamp; a runtime output path a
// hook writes (tmp/task-tracking/project-status.html) is documentation of behavior, not a citation.
const isCitation = file => /^(?:tmp|temp)\/reports\//.test(file) || /^plans\//.test(file) || /(?:^|[^0-9])\d{6,8}(?:[^0-9]|$)/.test(file);
// Placeholders name a convention, not a file.
const isTemplate = file => /[{}<>*]/.test(file);
// Generated mirrors repeat their sources; the source is checked instead.
const isMirror = file => /^(?:\.agents|\.codex|\.opencode)\//.test(file) || file === 'AGENTS.md';

export function findCitations(root) {
    const files = execFileSync('git', ['ls-files', '-z', '--', '*.md'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
    const found = new Set();
    for (const file of files) {
        if (isMirror(file)) continue;
        const text = fs.readFileSync(path.join(root, file), 'utf8');
        for (const match of text.matchAll(LOCAL_FILE)) {
            if (!isTemplate(match[1]) && isCitation(match[1])) found.add(`${file} :: ${match[1]}`);
        }
    }
    return [...found].sort();
}

test('tracked docs cite no new local-only tmp/ or plans/ file, and fixed citations leave the baseline', { skip: !isFrameworkRepo(repoRoot) }, () => {
    const baseline = new Set(JSON.parse(fs.readFileSync(baselinePath, 'utf8')).citations);
    const current = findCitations(repoRoot);
    const added = current.filter(entry => !baseline.has(entry));
    const fixed = [...baseline].filter(entry => !current.includes(entry));
    assert.deepEqual(
        added,
        [],
        'A tracked doc cites a local-only file that a clean checkout does not have. Carry the needed content into the doc, cite the plan or record by its id, or move the artifact to a committed home and cite that.'
    );
    assert.deepEqual(fixed, [], `These citations are gone: remove them from ${path.basename(baselinePath)} so they cannot come back.`);
});

test('the citation matcher flags a concrete report or plan and ignores conventions and runtime paths', () => {
    const sample = [
        'See tmp/reports/review-261116-p8a.md for the evidence.', // report → citation
        'Decided in plans/261116-1719-harness-gaps/plan.md.', // plan → citation
        'Mock-ups: tmp/design/261006-task-tracking/direction-a.html', // dated → citation
        'Write reports to tmp/reports/{skill}-{date}.md.', // convention → not
        'The report is written to tmp/task-tracking/project-status.html.' // runtime output → not
    ].join('\n');
    const hits = [...sample.matchAll(LOCAL_FILE)].map(match => match[1]).filter(file => !isTemplate(file) && isCitation(file));
    assert.deepEqual(hits, ['tmp/reports/review-261116-p8a.md', 'plans/261116-1719-harness-gaps/plan.md', 'tmp/design/261006-task-tracking/direction-a.html']);
});
