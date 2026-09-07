import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const skill = read('.claude/skills/journal/SKILL.md');
const writer = read('.claude/agents/journal-writer.md');
const journalPath = /`(?:\.\/)?docs\/journals\/(?:\{date\}-\{slug\}\.md)?`/;

function requireDestination(source, anchor, label) {
    const line = source.split(/\r?\n/).find(value => anchor.test(value));
    assert.ok(line, `${label}: missing destination instruction`);
    assert.match(line, journalPath, `${label}: journal destination must be docs/journals`);
    assert.doesNotMatch(line, /plans\/reports\//, `${label}: journal is not an assessment report`);
}

function assertSkillDestination(source) {
    requireDestination(source, /^2\. \*\*Write\*\*/, 'skill summary');
    requireDestination(source, /^\*\*Journal output:\*\*/, 'skill output owner');
    requireDestination(source, /^Keep journal entries/, 'skill body');
    requireDestination(source, /^\*\*IMPORTANT MUST ATTENTION Goal:/, 'skill closing');
    assert.match(source, /\*\*Journal output:\*\* `\.\/docs\/journals\/\{date\}-\{slug\}\.md`/);
    assert.match(source, /date format from the active plan context/);
    assert.match(source, /Use the `journal-writer` subagent/);
}

function assertWriterDestination(source) {
    requireDestination(source, /^- Write the journal file/, 'writer summary');
    requireDestination(source, /^6\. \*\*Write journal entry\*\*/, 'writer workflow');
    requireDestination(source, /^\*\*Journal location:\*\*/, 'writer output');
    requireDestination(source, /^\*\*IMPORTANT MUST ATTENTION\*\* Write the journal file/, 'writer closing');
    assert.match(source, /\.claude\/skills\/journal\/SKILL\.md/);
    assert.match(source, /Journal output/);
    assert.doesNotMatch(source, /(?:hook naming pattern|naming pattern from hooks)/);
    assert.match(source, /^name: journal-writer$/m);
    assert.match(source, /NEVER write journal entries for trivial issues/);
    assert.match(source, /200-500 words/);
    assert.match(source, /## Root Cause Analysis/);
}

function assertReportsDistinct(skillSource, writerSource) {
    for (const [label, source] of [['skill', skillSource], ['writer', writerSource]]) {
        const boundary = source.split(/\r?\n/).find(line => /intermediate assessments/.test(line));
        assert.ok(boundary, `${label}: missing intermediate assessment boundary`);
        assert.match(boundary, /`plans\/reports\/`/, `${label}: assessment reports retain their destination`);
        assert.match(boundary, /journal entries.*`\.\/docs\/journals\/`/, `${label}: durable journal stays separate`);
    }
    assert.match(writerSource, /For plan\/review work, create `plans\/reports\//);
}

// TC-HARNESS-015 / S15: prompt-contract checks, not measured agent execution.
// Intent: every output anchor agrees with the durable owner; changing even one
// destination must fail while formatting-only changes remain benign.
test('TC-HARNESS-015: skill journal destination and dated slug remain consistent', t => {
    assertSkillDestination(skill);
    for (const newline of ['\n', '\r\n']) {
        assertSkillDestination(skill.replace(/\r?\n/g, newline));
    }
    // Bounded domain: each of four anchors, five wrong directory spellings.
    const anchors = [/^2\. \*\*Write\*\*/, /^\*\*Journal output:/, /^Keep journal entries/, /^\*\*IMPORTANT MUST ATTENTION Goal:/];
    const wrongDirectories = ['plans/reports/', 'docs/journal/', 'docs/journals-extra/', 'docs/journals/../reports/', '../docs/journals/'];
    for (const anchor of anchors) {
        for (const directory of wrongDirectories) {
            const mutant = skill.split(/\r?\n/).map(line => anchor.test(line)
                ? line.replace(/(?:\.\/)?docs\/journals\//, directory) : line).join('\n');
            assert.notEqual(mutant, skill.replace(/\r?\n/g, '\n'), 'mutation must alter its target');
            assert.throws(() => assertSkillDestination(mutant), /journal destination must be docs\/journals/);
        }
    }
    t.diagnostic('Killed 20 single-anchor wrong-directory mutants; LF and CRLF controls accepted.');
});

// Intent: the writer consumes the skill owner without changing its journal role.
test('TC-HARNESS-015: writer destination consumes the journal skill owner', t => {
    assertWriterDestination(writer);
    assertWriterDestination(writer.replace(/\r?\n/g, '\n'));
    const anchors = [/^- Write the journal file/, /^6\. \*\*Write journal entry/, /^\*\*Journal location:/, /^\*\*IMPORTANT MUST ATTENTION\*\* Write the journal file/];
    for (const anchor of anchors) {
        const mutant = writer.split(/\r?\n/).map(line => anchor.test(line)
            ? line.replace('./docs/journals/', 'plans/reports/') : line).join('\n');
        assert.notEqual(mutant, writer.replace(/\r?\n/g, '\n'), 'mutation must alter its target');
        assert.throws(() => assertWriterDestination(mutant), /journal destination must be docs\/journals/);
    }
    t.diagnostic('Killed four writer wrong-directory mutants; role, severity, length and structure retained.');
});

// Intent: fixing durable output must not redirect intermediate assessment reports.
test('TC-HARNESS-015: intermediate reports remain distinct from journal entries', t => {
    assertReportsDistinct(skill, writer);
    assertReportsDistinct(skill.replace(/\r?\n/g, '\r\n'), writer.replace(/\r?\n/g, '\r\n'));
    for (const target of ['skill', 'writer']) {
        const source = target === 'skill' ? skill : writer;
        const mutant = source.split(/\r?\n/).map(line => /intermediate assessments/.test(line)
            ? line.replace('plans/reports/', './docs/journals/') : line).join('\n');
        assert.throws(() => assertReportsDistinct(target === 'skill' ? mutant : skill, target === 'writer' ? mutant : writer),
            /assessment reports retain their destination/);
    }
    t.diagnostic('Killed two assessment-redirection mutants; report task-tracking contract retained.');
});
